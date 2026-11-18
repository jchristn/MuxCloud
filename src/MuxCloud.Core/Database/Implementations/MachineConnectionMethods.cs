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
    /// Machine connection history data access. Portable SQL; engine differences live in the dialect.
    /// Thread safety: safe to call concurrently.
    /// </summary>
    public class MachineConnectionMethods : IMachineConnectionMethods
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
        public MachineConnectionMethods(DatabaseExecutor db)
        {
            ArgumentNullException.ThrowIfNull(db);
            _Db = db;
        }

        #endregion

        #region Public-Methods

        /// <inheritdoc />
        public async Task<MachineConnection> CreateAsync(MachineConnection connection, CancellationToken token = default)
        {
            ArgumentNullException.ThrowIfNull(connection);
            await _Db.ExecuteAsync(MachineConnectionRow.Insert, MachineConnectionRow.Parameters(connection), token).ConfigureAwait(false);
            return connection;
        }

        /// <inheritdoc />
        public async Task<MachineConnection> UpdateAsync(MachineConnection connection, CancellationToken token = default)
        {
            ArgumentNullException.ThrowIfNull(connection);
            await _Db.ExecuteAsync(MachineConnectionRow.Update, MachineConnectionRow.Parameters(connection), token).ConfigureAwait(false);
            return connection;
        }

        /// <inheritdoc />
        public Task<PagedResult<MachineConnection>> EnumerateAsync(string tenantId, string machineId, PageRequest page, CancellationToken token = default)
        {
            WhereBuilder where = new WhereBuilder().Add("tenant_id = @tenant_id", "tenant_id", tenantId).Add("machine_id = @machine_id", "machine_id", machineId);
            return Paging.QueryAsync(_Db, "machine_connections" + where.Build(), MachineConnectionRow.Columns, "connected_utc DESC, id DESC", where.Parameters, page, MachineConnectionRow.Map, token);
        }

        /// <inheritdoc />
        public async Task DeleteForMachineAsync(string tenantId, string machineId, CancellationToken token = default)
        {
            await _Db.ExecuteAsync("DELETE FROM machine_connections WHERE tenant_id = @tenant_id AND machine_id = @machine_id", new SqlParameters().Add("tenant_id", tenantId).Add("machine_id", machineId), token).ConfigureAwait(false);
        }

        /// <inheritdoc />
        public Task<int> CloseOpenAsync(string nodeId, DateTime closedUtc, CancellationToken token = default)
        {
            SqlParameters p = new SqlParameters().Add("node", nodeId).Add("t", closedUtc).Add("reason", "server restarted");
            return _Db.ExecuteAsync("UPDATE machine_connections SET disconnected_utc = @t, close_reason = @reason WHERE node_id = @node AND disconnected_utc IS NULL", p, token);
        }

        #endregion
    }
}
