namespace MuxCloud.Core.Database.Implementations
{
    using System;
    using System.Collections.Generic;
    using System.Threading;
    using System.Threading.Tasks;
    using MuxCloud.Core.Database.Implementations.Rows;
    using MuxCloud.Core.Database.Interfaces;
    using MuxCloud.Core.Models;

    /// <summary>
    /// Machine data access. Portable SQL; engine differences live in the dialect.
    /// Thread safety: safe to call concurrently.
    /// </summary>
    public class MachineMethods : IMachineMethods
    {
        #region Private-Members

        private readonly DatabaseExecutor _Db;

        #endregion

        #region Constructors-and-Factories

        /// <summary>
        /// Instantiate.
        /// </summary>
        /// <param name="db">Executor.</param>
        /// <exception cref="ArgumentNullException">db is null.</exception>
        public MachineMethods(DatabaseExecutor db)
        {
            ArgumentNullException.ThrowIfNull(db);
            _Db = db;
        }

        #endregion

        #region Public-Methods

        /// <inheritdoc />
        public async Task<Machine> CreateAsync(Machine machine, CancellationToken token = default)
        {
            ArgumentNullException.ThrowIfNull(machine);
            await _Db.ExecuteAsync(MachineRow.Insert, MachineRow.Parameters(machine), token).ConfigureAwait(false);
            return machine;
        }

        /// <inheritdoc />
        public Task<Machine?> ReadAsync(string id, CancellationToken token = default)
        {
            return _Db.QueryFirstAsync("SELECT " + MachineRow.Columns + " FROM machines WHERE id = @id", new SqlParameters().Add("id", id), MachineRow.Map, token);
        }

        /// <inheritdoc />
        public Task<Machine?> ReadAsync(string tenantId, string id, CancellationToken token = default)
        {
            return _Db.QueryFirstAsync("SELECT " + MachineRow.Columns + " FROM machines WHERE tenant_id = @tenant_id AND id = @id", new SqlParameters().Add("tenant_id", tenantId).Add("id", id), MachineRow.Map, token);
        }

        /// <inheritdoc />
        public Task<Machine?> ReadByFingerprintAsync(string tenantId, string userId, string fingerprint, CancellationToken token = default)
        {
            SqlParameters p = new SqlParameters().Add("tenant_id", tenantId).Add("user_id", userId).Add("f", fingerprint);
            return _Db.QueryFirstAsync("SELECT " + MachineRow.Columns + " FROM machines WHERE tenant_id = @tenant_id AND user_id = @user_id AND fingerprint = @f", p, MachineRow.Map, token);
        }

        /// <inheritdoc />
        public async Task<Machine> UpdateAsync(Machine machine, CancellationToken token = default)
        {
            ArgumentNullException.ThrowIfNull(machine);
            machine.LastUpdateUtc = DateTime.UtcNow;
            await _Db.ExecuteAsync(MachineRow.Update, MachineRow.Parameters(machine), token).ConfigureAwait(false);
            return machine;
        }

        /// <inheritdoc />
        public async Task DeleteAsync(string tenantId, string id, CancellationToken token = default)
        {
            await _Db.ExecuteAsync("DELETE FROM machines WHERE tenant_id = @tenant_id AND id = @id", new SqlParameters().Add("tenant_id", tenantId).Add("id", id), token).ConfigureAwait(false);
        }

        /// <inheritdoc />
        public Task<PagedResult<Machine>> EnumerateAsync(MachineFilter filter, PageRequest page, CancellationToken token = default)
        {
            ArgumentNullException.ThrowIfNull(filter);
            WhereBuilder where = new WhereBuilder();
            if (!String.IsNullOrEmpty(filter.TenantId)) where.Add("tenant_id = @tenant_id", "tenant_id", filter.TenantId);
            if (!String.IsNullOrEmpty(filter.UserId)) where.Add("user_id = @user_id", "user_id", filter.UserId);
            if (!filter.IncludeRevoked) where.Add("revoked_utc IS NULL");
            where.Contains(new[] { "name", "hostname" }, "q", filter.NameContains);
            return Paging.QueryAsync(_Db, "machines" + where.Build(), MachineRow.Columns, "last_update_utc DESC, id DESC", where.Parameters, page, MachineRow.Map, token);
        }

        /// <inheritdoc />
        public Task<List<Machine>> ListForUserAsync(string tenantId, string userId, CancellationToken token = default)
        {
            return _Db.QueryAsync("SELECT " + MachineRow.Columns + " FROM machines WHERE tenant_id = @tenant_id AND user_id = @user_id ORDER BY created_utc", new SqlParameters().Add("tenant_id", tenantId).Add("user_id", userId), MachineRow.Map, token);
        }

        /// <inheritdoc />
        public Task<long> CountActiveAsync(string tenantId, string userId, CancellationToken token = default)
        {
            return _Db.ScalarAsync("SELECT COUNT(*) FROM machines WHERE tenant_id = @tenant_id AND user_id = @user_id AND revoked_utc IS NULL", new SqlParameters().Add("tenant_id", tenantId).Add("user_id", userId), token);
        }

        /// <inheritdoc />
        public Task<long> CountAsync(CancellationToken token = default)
        {
            return _Db.ScalarAsync("SELECT COUNT(*) FROM machines", null, token);
        }

        /// <inheritdoc />
        public async Task UpdateConnectedAsync(string id, string muxVersion, int protocolVersion, string hostname, string os, DateTime connectedUtc, CancellationToken token = default)
        {
            SqlParameters p = new SqlParameters().Add("id", id).Add("v", muxVersion ?? String.Empty).Add("pv", protocolVersion).Add("h", hostname ?? String.Empty).Add("os", os ?? String.Empty).Add("t", connectedUtc);
            await _Db.ExecuteAsync("UPDATE machines SET mux_version = @v, protocol_version = @pv, hostname = @h, os = @os, last_connected_utc = @t, last_seen_utc = @t, last_update_utc = @t WHERE id = @id", p, token).ConfigureAwait(false);
        }

        /// <inheritdoc />
        public async Task UpdateDisconnectedAsync(string id, DateTime disconnectedUtc, CancellationToken token = default)
        {
            SqlParameters p = new SqlParameters().Add("id", id).Add("t", disconnectedUtc).Add("zero", 0);
            await _Db.ExecuteAsync("UPDATE machines SET last_disconnected_utc = @t, last_seen_utc = @t, active_runs = @zero, awaiting_approval = @zero, last_update_utc = @t WHERE id = @id", p, token).ConfigureAwait(false);
        }

        /// <inheritdoc />
        public async Task TouchAsync(string id, DateTime seenUtc, CancellationToken token = default)
        {
            await _Db.ExecuteAsync("UPDATE machines SET last_seen_utc = @t WHERE id = @id", new SqlParameters().Add("id", id).Add("t", seenUtc), token).ConfigureAwait(false);
        }

        /// <inheritdoc />
        public async Task UpdateStatusAsync(string id, int activeRuns, int awaitingApproval, bool remoteToolApproval, string muxVersion, DateTime seenUtc, CancellationToken token = default)
        {
            SqlParameters p = new SqlParameters().Add("id", id).Add("r", activeRuns).Add("a", awaitingApproval).Add("rta", remoteToolApproval).Add("t", seenUtc);
            string sql = "UPDATE machines SET active_runs = @r, awaiting_approval = @a, remote_tool_approval = @rta, last_seen_utc = @t";
            if (!String.IsNullOrEmpty(muxVersion))
            {
                sql += ", mux_version = @v";
                p.Add("v", muxVersion);
            }

            await _Db.ExecuteAsync(sql + " WHERE id = @id", p, token).ConfigureAwait(false);
        }

        #endregion
    }
}
