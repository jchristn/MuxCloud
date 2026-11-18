namespace MuxCloud.Core.Services
{
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Threading;
    using System.Threading.Tasks;
    using MuxCloud.Core.Database;
    using MuxCloud.Core.Exceptions;
    using MuxCloud.Core.Models;
    using MuxCloud.Core.Requests;
    using MuxCloud.Core.Services.Interfaces;
    using MuxCloud.Core.Settings;
    using MuxCloud.Protocol;

    /// <summary>
    /// Push device registration and notification dispatch. Notifications carry the machine name, a generic phrase, and
    /// deep-link identifiers, never conversation content. They are sent only for approval_requested and run_completed,
    /// only when Push.Enabled is true, and only to accounts with the mobile.access entitlement. Devices Expo reports as
    /// DeviceNotRegistered are removed.
    /// Thread safety: safe to call concurrently.
    /// </summary>
    public class DeviceService
    {
        #region Public-Members

        /// <summary>
        /// Push sender in use. Replace it in tests.
        /// </summary>
        public IPushSender Sender
        {
            get { return _Sender; }
            set { _Sender = value ?? throw new ArgumentNullException(nameof(Sender)); }
        }

        /// <summary>
        /// Called with a log line for each dispatch problem, or null.
        /// </summary>
        public Action<string>? Log { get; set; } = null;

        #endregion

        #region Private-Members

        private readonly DatabaseDriverBase _Db;
        private readonly PushSettings _Settings;
        private readonly EntitlementService _Entitlements;
        private IPushSender _Sender;

        #endregion

        #region Constructors-and-Factories

        /// <summary>
        /// Instantiate.
        /// </summary>
        /// <param name="db">Database.</param>
        /// <param name="settings">Push settings.</param>
        /// <param name="entitlements">Entitlement service.</param>
        /// <param name="sender">Push sender.</param>
        /// <exception cref="ArgumentNullException">An argument is null.</exception>
        public DeviceService(DatabaseDriverBase db, PushSettings settings, EntitlementService entitlements, IPushSender sender)
        {
            ArgumentNullException.ThrowIfNull(db);
            ArgumentNullException.ThrowIfNull(settings);
            ArgumentNullException.ThrowIfNull(entitlements);
            ArgumentNullException.ThrowIfNull(sender);
            _Db = db;
            _Settings = settings;
            _Entitlements = entitlements;
            _Sender = sender;
        }

        #endregion

        #region Public-Methods

        /// <summary>
        /// Register a device for push. Registering a token the user already registered returns that device.
        /// </summary>
        /// <param name="user">Owner.</param>
        /// <param name="request">Registration.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>The device and whether it was created.</returns>
        /// <exception cref="ApiException">400 for invalid input, 409 when the user has too many devices.</exception>
        public async Task<DeviceRegistration> RegisterAsync(User user, DeviceRegisterRequest request, CancellationToken token = default)
        {
            ArgumentNullException.ThrowIfNull(user);
            ArgumentNullException.ThrowIfNull(request);
            string pushToken = (request.ExpoPushToken ?? String.Empty).Trim();
            if (!IsExpoToken(pushToken)) throw ApiException.BadRequest("expoPushToken must be an Expo push token such as ExponentPushToken[xxxx].");
            string platform = (request.Platform ?? String.Empty).Trim().ToLowerInvariant();
            if (platform != "ios" && platform != "android") throw ApiException.BadRequest("platform must be ios or android.");
            string name = (request.Name ?? String.Empty).Trim();
            if (name.Length > 100) throw ApiException.BadRequest("name must be at most 100 characters.");
            Device? existing = await _Db.Devices.ReadByTokenAsync(user.TenantId, user.Id, pushToken, token).ConfigureAwait(false);
            if (existing != null)
            {
                if (existing.Platform != platform || (name.Length > 0 && existing.Name != name))
                {
                    existing.Platform = platform;
                    if (name.Length > 0) existing.Name = name;
                    await _Db.Devices.UpdateAsync(existing, token).ConfigureAwait(false);
                }

                return new DeviceRegistration { Device = existing, Created = false };
            }

            List<Device> current = await _Db.Devices.ListForUserAsync(user.TenantId, user.Id, token).ConfigureAwait(false);
            if (current.Count >= _Settings.MaxDevicesPerUser) throw ApiException.Conflict("Conflict", "You have registered the maximum of " + _Settings.MaxDevicesPerUser + " devices. Remove one first.");
            Device device = new Device { TenantId = user.TenantId, UserId = user.Id, ExpoPushToken = pushToken, Platform = platform, Name = name };
            await _Db.Devices.CreateAsync(device, token).ConfigureAwait(false);
            return new DeviceRegistration { Device = device, Created = true };
        }

        /// <summary>
        /// A user's devices, newest first.
        /// </summary>
        /// <param name="user">Owner.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Devices.</returns>
        public Task<List<Device>> ListAsync(User user, CancellationToken token = default)
        {
            ArgumentNullException.ThrowIfNull(user);
            return _Db.Devices.ListForUserAsync(user.TenantId, user.Id, token);
        }

        /// <summary>
        /// Remove one of a user's devices.
        /// </summary>
        /// <param name="user">Owner.</param>
        /// <param name="deviceId">Device.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Task.</returns>
        /// <exception cref="ApiException">404 when the device is missing or belongs to someone else.</exception>
        public async Task DeleteAsync(User user, string? deviceId, CancellationToken token = default)
        {
            ArgumentNullException.ThrowIfNull(user);
            Device? device = String.IsNullOrWhiteSpace(deviceId) ? null : await _Db.Devices.ReadAsync(user.TenantId, deviceId, token).ConfigureAwait(false);
            if (device == null || device.UserId != user.Id) throw ApiException.NotFound("Device");
            await _Db.Devices.DeleteAsync(user.TenantId, device.Id, token).ConfigureAwait(false);
        }

        /// <summary>
        /// Whether a status kind produces a push notification.
        /// </summary>
        /// <param name="kind">Status kind.</param>
        /// <returns>True for approval_requested and run_completed.</returns>
        public static bool IsNotifiable(string? kind)
        {
            return kind == MachineStatusKinds.ApprovalRequested || kind == MachineStatusKinds.RunCompleted;
        }

        /// <summary>
        /// Send a push notification to the machine owner's devices for a notifiable status push.
        /// </summary>
        /// <param name="machine">Machine.</param>
        /// <param name="status">Status push.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Messages sent (0 when skipped).</returns>
        public async Task<int> NotifyAsync(Machine machine, MachineStatusPayload status, CancellationToken token = default)
        {
            ArgumentNullException.ThrowIfNull(machine);
            ArgumentNullException.ThrowIfNull(status);
            if (!_Settings.Enabled || !IsNotifiable(status.Kind)) return 0;
            User? user = await _Db.Users.ReadAsync(machine.TenantId, machine.UserId, token).ConfigureAwait(false);
            if (user == null || !user.Active) return 0;
            EffectiveEntitlements entitlements = await _Entitlements.GetAsync(user.AccountId, token).ConfigureAwait(false);
            if (!EntitlementService.IsEnabled(entitlements, Constants.FeatureMobileAccess)) return 0;
            List<Device> devices = await _Db.Devices.ListForUserAsync(machine.TenantId, machine.UserId, token).ConfigureAwait(false);
            if (devices.Count == 0) return 0;
            string title = String.IsNullOrWhiteSpace(machine.Name) ? "Mux" : machine.Name;
            string body = status.Kind == MachineStatusKinds.ApprovalRequested ? "A tool is waiting for your approval." : "A run finished.";
            List<PushMessage> messages = devices.Select(d => new PushMessage
            {
                To = d.ExpoPushToken,
                Title = title,
                Body = body,
                Data = new Dictionary<string, string>
                {
                    { "machineId", machine.Id },
                    { "sessionId", status.SessionId },
                    { "runId", status.RunId },
                    { "kind", status.Kind }
                }
            }).ToList();
            List<PushResult> results;
            try
            {
                results = await _Sender.SendAsync(messages, token).ConfigureAwait(false);
            }
            catch (Exception e) when (!(e is OperationCanceledException))
            {
                Log?.Invoke("push dispatch failed for " + machine.Id + ": " + e.Message);
                return 0;
            }

            foreach (PushResult result in results.Where(r => !r.Ok))
            {
                if (String.Equals(result.ErrorCode, "DeviceNotRegistered", StringComparison.Ordinal))
                {
                    await _Db.Devices.DeleteByTokenAsync(result.To, token).ConfigureAwait(false);
                    Log?.Invoke("removed an unregistered push device for " + machine.UserId);
                }
                else
                {
                    Log?.Invoke("push to a device of " + machine.UserId + " failed: " + result.ErrorCode);
                }
            }

            return results.Count(r => r.Ok);
        }

        #endregion

        #region Private-Methods

        private static bool IsExpoToken(string value)
        {
            if (value.Length < 20 || value.Length > 256 || !value.EndsWith("]", StringComparison.Ordinal)) return false;
            return value.StartsWith("ExponentPushToken[", StringComparison.Ordinal) || value.StartsWith("ExpoPushToken[", StringComparison.Ordinal);
        }

        #endregion
    }
}
