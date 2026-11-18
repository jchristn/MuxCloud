namespace MuxCloud.Core.Database.Interfaces
{
    using System;
    using System.Collections.Generic;
    using System.Threading;
    using System.Threading.Tasks;
    using MuxCloud.Core.Models;

    /// <summary>
    /// Machine data access.
    /// </summary>
    public interface IMachineMethods
    {
        /// <summary>
        /// Create a machine.
        /// </summary>
        /// <param name="machine">Machine to create.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Created machine.</returns>
        Task<Machine> CreateAsync(Machine machine, CancellationToken token = default);

        /// <summary>
        /// Read a machine by identifier (tunnel handshake and administration).
        /// </summary>
        /// <param name="id">Machine identifier.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Machine, or null.</returns>
        Task<Machine?> ReadAsync(string id, CancellationToken token = default);

        /// <summary>
        /// Read a machine within a tenant.
        /// </summary>
        /// <param name="tenantId">Tenant identifier.</param>
        /// <param name="id">Machine identifier.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Machine, or null.</returns>
        Task<Machine?> ReadAsync(string tenantId, string id, CancellationToken token = default);

        /// <summary>
        /// Read a user's machine by fingerprint.
        /// </summary>
        /// <param name="tenantId">Tenant identifier.</param>
        /// <param name="userId">User identifier.</param>
        /// <param name="fingerprint">Fingerprint.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Machine, or null.</returns>
        Task<Machine?> ReadByFingerprintAsync(string tenantId, string userId, string fingerprint, CancellationToken token = default);

        /// <summary>
        /// Update a machine.
        /// </summary>
        /// <param name="machine">Machine with changes.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Updated machine.</returns>
        Task<Machine> UpdateAsync(Machine machine, CancellationToken token = default);

        /// <summary>
        /// Delete a machine.
        /// </summary>
        /// <param name="tenantId">Tenant identifier.</param>
        /// <param name="id">Machine identifier.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Task.</returns>
        Task DeleteAsync(string tenantId, string id, CancellationToken token = default);

        /// <summary>
        /// Enumerate machines, most recently updated first.
        /// </summary>
        /// <param name="filter">Filter.</param>
        /// <param name="page">Paging.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Page of machines.</returns>
        Task<PagedResult<Machine>> EnumerateAsync(MachineFilter filter, PageRequest page, CancellationToken token = default);

        /// <summary>
        /// Every machine of a user, including revoked ones.
        /// </summary>
        /// <param name="tenantId">Tenant identifier.</param>
        /// <param name="userId">User identifier.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Machines.</returns>
        Task<List<Machine>> ListForUserAsync(string tenantId, string userId, CancellationToken token = default);

        /// <summary>
        /// Count a user's machines that are not revoked.
        /// </summary>
        /// <param name="tenantId">Tenant identifier.</param>
        /// <param name="userId">User identifier.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Count.</returns>
        Task<long> CountActiveAsync(string tenantId, string userId, CancellationToken token = default);

        /// <summary>
        /// Count machines.
        /// </summary>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Count.</returns>
        Task<long> CountAsync(CancellationToken token = default);

        /// <summary>
        /// Record an accepted handshake: version details and connection time.
        /// </summary>
        /// <param name="id">Machine identifier.</param>
        /// <param name="muxVersion">Reported mux version.</param>
        /// <param name="protocolVersion">Negotiated protocol version.</param>
        /// <param name="hostname">Reported host name.</param>
        /// <param name="os">Reported operating system.</param>
        /// <param name="connectedUtc">Connection time.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Task.</returns>
        Task UpdateConnectedAsync(string id, string muxVersion, int protocolVersion, string hostname, string os, DateTime connectedUtc, CancellationToken token = default);

        /// <summary>
        /// Record a disconnect.
        /// </summary>
        /// <param name="id">Machine identifier.</param>
        /// <param name="disconnectedUtc">Disconnect time.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Task.</returns>
        Task UpdateDisconnectedAsync(string id, DateTime disconnectedUtc, CancellationToken token = default);

        /// <summary>
        /// Record that the machine was seen.
        /// </summary>
        /// <param name="id">Machine identifier.</param>
        /// <param name="seenUtc">Time seen.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Task.</returns>
        Task TouchAsync(string id, DateTime seenUtc, CancellationToken token = default);

        /// <summary>
        /// Record a status push.
        /// </summary>
        /// <param name="id">Machine identifier.</param>
        /// <param name="activeRuns">Runs in progress.</param>
        /// <param name="awaitingApproval">Runs awaiting approval.</param>
        /// <param name="remoteToolApproval">Whether remote tool approval is enabled.</param>
        /// <param name="muxVersion">Reported mux version, or empty to leave unchanged.</param>
        /// <param name="seenUtc">Time seen.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Task.</returns>
        Task UpdateStatusAsync(string id, int activeRuns, int awaitingApproval, bool remoteToolApproval, string muxVersion, DateTime seenUtc, CancellationToken token = default);
    }
}
