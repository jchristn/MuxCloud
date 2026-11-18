namespace MuxCloud.Core.Database.Interfaces
{
    using System;
    using System.Collections.Generic;
    using System.Threading;
    using System.Threading.Tasks;
    using MuxCloud.Core.Models;

    /// <summary>
    /// Machine connection history data access.
    /// </summary>
    public interface IMachineConnectionMethods
    {
        /// <summary>
        /// Record a connection.
        /// </summary>
        /// <param name="connection">Connection to record.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Recorded connection.</returns>
        Task<MachineConnection> CreateAsync(MachineConnection connection, CancellationToken token = default);

        /// <summary>
        /// Update a connection.
        /// </summary>
        /// <param name="connection">Connection with changes.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Updated connection.</returns>
        Task<MachineConnection> UpdateAsync(MachineConnection connection, CancellationToken token = default);

        /// <summary>
        /// Enumerate a machine's connections, newest first.
        /// </summary>
        /// <param name="tenantId">Tenant identifier.</param>
        /// <param name="machineId">Machine identifier.</param>
        /// <param name="page">Paging.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Page of connections.</returns>
        Task<PagedResult<MachineConnection>> EnumerateAsync(string tenantId, string machineId, PageRequest page, CancellationToken token = default);

        /// <summary>
        /// Delete a machine's connection history.
        /// </summary>
        /// <param name="tenantId">Tenant identifier.</param>
        /// <param name="machineId">Machine identifier.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Task.</returns>
        Task DeleteForMachineAsync(string tenantId, string machineId, CancellationToken token = default);

        /// <summary>
        /// Close connections a previous run of this node left open.
        /// </summary>
        /// <param name="nodeId">Server node.</param>
        /// <param name="closedUtc">Close time.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Connections closed.</returns>
        Task<int> CloseOpenAsync(string nodeId, DateTime closedUtc, CancellationToken token = default);
    }
}
