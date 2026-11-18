namespace MuxCloud.Core.Services
{
    using System;
    using System.Collections.Generic;
    using System.Threading;
    using System.Threading.Tasks;
    using MuxCloud.Core.Database;
    using MuxCloud.Core.Exceptions;
    using MuxCloud.Core.Models;
    using MuxCloud.Core.Requests;
    using MuxCloud.Core.Security;
    using MuxCloud.Core.Services.Interfaces;
    using MuxCloud.Core.Settings;
    using MuxCloud.Protocol;

    /// <summary>
    /// Machine enrollment and lifecycle. Machine secrets are stored AES-256-GCM encrypted with a key derived from the
    /// signing key, plus their last four characters for display.
    /// Thread safety: safe to call concurrently.
    /// </summary>
    public class MachineService
    {
        #region Public-Members

        /// <summary>
        /// Raised when a machine is revoked or deleted, so its live tunnel can be closed.
        /// </summary>
        public event EventHandler<MachineRevokedEventArgs>? MachineRevoked;

        #endregion

        #region Private-Members

        private readonly DatabaseDriverBase _Db;
        private readonly MuxCloudSettings _Settings;
        private readonly TokenProtector _Protector;
        private readonly AccountService _Accounts;
        private readonly EntitlementService _Entitlements;
        private readonly IAccountNotifier _Notifier;
        private readonly AuditService _Audit;

        #endregion

        #region Constructors-and-Factories

        /// <summary>
        /// Instantiate.
        /// </summary>
        /// <param name="db">Database.</param>
        /// <param name="settings">Settings.</param>
        /// <param name="protector">Secret protector.</param>
        /// <param name="accounts">Account service (credential checks).</param>
        /// <param name="entitlements">Entitlement service.</param>
        /// <param name="notifier">Notifier.</param>
        /// <param name="audit">Audit service.</param>
        /// <exception cref="ArgumentNullException">An argument is null.</exception>
        public MachineService(DatabaseDriverBase db, MuxCloudSettings settings, TokenProtector protector, AccountService accounts, EntitlementService entitlements, IAccountNotifier notifier, AuditService audit)
        {
            ArgumentNullException.ThrowIfNull(db);
            ArgumentNullException.ThrowIfNull(settings);
            ArgumentNullException.ThrowIfNull(protector);
            ArgumentNullException.ThrowIfNull(accounts);
            ArgumentNullException.ThrowIfNull(entitlements);
            ArgumentNullException.ThrowIfNull(notifier);
            ArgumentNullException.ThrowIfNull(audit);
            _Db = db;
            _Settings = settings;
            _Protector = protector;
            _Accounts = accounts;
            _Entitlements = entitlements;
            _Notifier = notifier;
            _Audit = audit;
        }

        #endregion

        #region Public-Methods

        /// <summary>
        /// Enroll a machine with the user's credentials. Re-enrolling the same fingerprint keeps the machine and rotates its secret.
        /// </summary>
        /// <param name="request">Enrollment request.</param>
        /// <param name="sourceIp">Requester IP.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>The machine and its new secret.</returns>
        /// <exception cref="ApiException">400, 401, 402 EntitlementExceeded, 403, 429.</exception>
        public async Task<EnrollResult> EnrollAsync(EnrollRequest request, string sourceIp, CancellationToken token = default)
        {
            ArgumentNullException.ThrowIfNull(request);
            string name = Required(request.MachineName, 1, 100, "machineName");
            string fingerprint = Required(request.Fingerprint, 16, 128, "fingerprint");
            string hostname = Optional(request.Hostname, 200, "hostname");
            string os = Optional(request.Os, 200, "os");
            string muxVersion = Optional(request.MuxVersion, 64, "muxVersion");
            User user = await _Accounts.AuthenticateCredentialsAsync(request.Email, request.Password, sourceIp, "machine.enroll", token).ConfigureAwait(false);
            string secret = TunnelProof.CreateMachineSecret();
            Machine? existing = await _Db.Machines.ReadByFingerprintAsync(user.TenantId, user.Id, fingerprint, token).ConfigureAwait(false);
            if (existing != null)
            {
                existing.Name = name;
                existing.Hostname = hostname;
                existing.Os = os;
                if (muxVersion.Length > 0) existing.MuxVersion = muxVersion;
                existing.SecretEncrypted = _Protector.EncryptSecret(secret);
                existing.SecretLast4 = TunnelProof.Last4(secret);
                existing.RevokedUtc = null;
                await _Db.Machines.UpdateAsync(existing, token).ConfigureAwait(false);
                await _Audit.WriteAsync("machine.enroll", "success", user.TenantId, user.Id, "machine", existing.Id, sourceIp, "re-enrolled; secret rotated", token).ConfigureAwait(false);
                return new EnrollResult { Machine = existing, Secret = secret, Reenrolled = true };
            }

            EffectiveEntitlements entitlements = await _Entitlements.GetAsync(user.AccountId, token).ConfigureAwait(false);
            long? limit = EntitlementService.Limit(entitlements, Constants.FeatureMachinesMax);
            if (limit.HasValue)
            {
                long count = await _Db.Machines.CountActiveAsync(user.TenantId, user.Id, token).ConfigureAwait(false);
                if (count >= limit.Value) throw new ApiException(402, "EntitlementExceeded", "Your plan allows " + limit.Value + " machines. Remove one or upgrade to add another.");
            }

            Machine machine = new Machine
            {
                TenantId = user.TenantId,
                UserId = user.Id,
                Name = name,
                Hostname = hostname,
                Os = os,
                Fingerprint = fingerprint,
                MuxVersion = muxVersion,
                SecretEncrypted = _Protector.EncryptSecret(secret),
                SecretLast4 = TunnelProof.Last4(secret)
            };
            await _Db.Machines.CreateAsync(machine, token).ConfigureAwait(false);
            await _Audit.WriteAsync("machine.enroll", "success", user.TenantId, user.Id, "machine", machine.Id, sourceIp, "new machine " + name, token).ConfigureAwait(false);
            await _Notifier.SendMachineEnrolledAsync(user, machine, sourceIp, _Settings.Server.PublicUrl + "/machines/" + Uri.EscapeDataString(machine.Id), token).ConfigureAwait(false);
            return new EnrollResult { Machine = machine, Secret = secret, Reenrolled = false };
        }

        /// <summary>
        /// Read one of a user's machines.
        /// </summary>
        /// <param name="user">Owner.</param>
        /// <param name="machineId">Machine.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Machine.</returns>
        /// <exception cref="ApiException">404 when missing or owned by someone else.</exception>
        public async Task<Machine> ReadForUserAsync(User user, string? machineId, CancellationToken token = default)
        {
            ArgumentNullException.ThrowIfNull(user);
            if (String.IsNullOrWhiteSpace(machineId)) throw ApiException.NotFound("Machine");
            Machine? machine = await _Db.Machines.ReadAsync(user.TenantId, machineId, token).ConfigureAwait(false);
            if (machine == null || machine.UserId != user.Id) throw ApiException.NotFound("Machine");
            return machine;
        }

        /// <summary>
        /// Rename a machine.
        /// </summary>
        /// <param name="user">Owner.</param>
        /// <param name="machineId">Machine.</param>
        /// <param name="name">New name.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Updated machine.</returns>
        /// <exception cref="ApiException">400, 404.</exception>
        public async Task<Machine> RenameAsync(User user, string? machineId, string? name, CancellationToken token = default)
        {
            Machine machine = await ReadForUserAsync(user, machineId, token).ConfigureAwait(false);
            machine.Name = Required(name, 1, 100, "name");
            return await _Db.Machines.UpdateAsync(machine, token).ConfigureAwait(false);
        }

        /// <summary>
        /// Revoke a machine: its secret stops working and its tunnel closes with 4403.
        /// </summary>
        /// <param name="user">Owner.</param>
        /// <param name="machineId">Machine.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Revoked machine.</returns>
        /// <exception cref="ApiException">404.</exception>
        public async Task<Machine> RevokeAsync(User user, string? machineId, CancellationToken token = default)
        {
            Machine machine = await ReadForUserAsync(user, machineId, token).ConfigureAwait(false);
            await RevokeInternalAsync(user, machine, true, token).ConfigureAwait(false);
            return machine;
        }

        /// <summary>
        /// Revoke and delete a machine with its history.
        /// </summary>
        /// <param name="user">Owner.</param>
        /// <param name="machineId">Machine.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Task.</returns>
        /// <exception cref="ApiException">404.</exception>
        public async Task DeleteAsync(User user, string? machineId, CancellationToken token = default)
        {
            Machine machine = await ReadForUserAsync(user, machineId, token).ConfigureAwait(false);
            await DeleteInternalAsync(user, machine, token).ConfigureAwait(false);
        }

        /// <summary>
        /// Revoke and delete every machine of a user (account deletion).
        /// </summary>
        /// <param name="user">Owner.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Task.</returns>
        public async Task DeleteAllForUserAsync(User user, CancellationToken token = default)
        {
            ArgumentNullException.ThrowIfNull(user);
            List<Machine> machines = await _Db.Machines.ListForUserAsync(user.TenantId, user.Id, token).ConfigureAwait(false);
            foreach (Machine machine in machines) await DeleteInternalAsync(user, machine, token).ConfigureAwait(false);
        }

        /// <summary>
        /// Every machine of a user, including revoked ones.
        /// </summary>
        /// <param name="user">Owner.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Machines.</returns>
        public Task<List<Machine>> ListForUserAsync(User user, CancellationToken token = default)
        {
            ArgumentNullException.ThrowIfNull(user);
            return _Db.Machines.ListForUserAsync(user.TenantId, user.Id, token);
        }

        /// <summary>
        /// Decrypt a machine's secret for handshake verification.
        /// </summary>
        /// <param name="machine">Machine.</param>
        /// <returns>Secret, or null when revoked or undecryptable.</returns>
        public string? GetSecret(Machine machine)
        {
            ArgumentNullException.ThrowIfNull(machine);
            if (machine.RevokedUtc != null) return null;
            return _Protector.DecryptSecret(machine.SecretEncrypted);
        }

        #endregion

        #region Private-Methods

        private async Task RevokeInternalAsync(User user, Machine machine, bool notify, CancellationToken token)
        {
            if (machine.RevokedUtc == null)
            {
                machine.RevokedUtc = DateTime.UtcNow;
                machine.SecretEncrypted = String.Empty;
                await _Db.Machines.UpdateAsync(machine, token).ConfigureAwait(false);
                await _Audit.WriteAsync("machine.revoke", "success", machine.TenantId, user.Id, "machine", machine.Id, null, null, token).ConfigureAwait(false);
                if (notify) await _Notifier.SendMachineRevokedAsync(user, machine, token).ConfigureAwait(false);
            }

            MachineRevoked?.Invoke(this, new MachineRevokedEventArgs(machine.Id, machine.UserId, false));
        }

        private async Task DeleteInternalAsync(User user, Machine machine, CancellationToken token)
        {
            await RevokeInternalAsync(user, machine, false, token).ConfigureAwait(false);
            await _Db.MachineConnections.DeleteForMachineAsync(machine.TenantId, machine.Id, token).ConfigureAwait(false);
            await _Db.Machines.DeleteAsync(machine.TenantId, machine.Id, token).ConfigureAwait(false);
            await _Audit.WriteAsync("machine.delete", "success", machine.TenantId, user.Id, "machine", machine.Id, null, null, token).ConfigureAwait(false);
            MachineRevoked?.Invoke(this, new MachineRevokedEventArgs(machine.Id, machine.UserId, true));
        }

        private static string Required(string? value, int min, int max, string field)
        {
            string trimmed = (value ?? String.Empty).Trim();
            if (trimmed.Length < min || trimmed.Length > max) throw ApiException.BadRequest(field + " must be " + min + " to " + max + " characters.");
            return trimmed;
        }

        private static string Optional(string? value, int max, string field)
        {
            string trimmed = (value ?? String.Empty).Trim();
            if (trimmed.Length > max) throw ApiException.BadRequest(field + " must be at most " + max + " characters.");
            return trimmed;
        }

        #endregion
    }
}
