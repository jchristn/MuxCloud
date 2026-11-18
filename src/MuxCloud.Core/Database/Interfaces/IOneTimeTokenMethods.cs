namespace MuxCloud.Core.Database.Interfaces
{
    using System;
    using System.Collections.Generic;
    using System.Threading;
    using System.Threading.Tasks;
    using MuxCloud.Core.Models;

    /// <summary>
    /// One-time token data access.
    /// </summary>
    public interface IOneTimeTokenMethods
    {
        /// <summary>
        /// Create a token record.
        /// </summary>
        /// <param name="item">Token record to create.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Created record.</returns>
        Task<OneTimeToken> CreateAsync(OneTimeToken item, CancellationToken token = default);

        /// <summary>
        /// Read a token record by hash.
        /// </summary>
        /// <param name="tokenHash">SHA-256 hex of the token value.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Record, or null.</returns>
        Task<OneTimeToken?> ReadByHashAsync(string tokenHash, CancellationToken token = default);

        /// <summary>
        /// Mark a record used if it is not already.
        /// </summary>
        /// <param name="id">Record identifier.</param>
        /// <param name="usedUtc">Time of use.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>True if this call marked it.</returns>
        Task<bool> MarkUsedAsync(string id, DateTime usedUtc, CancellationToken token = default);

        /// <summary>
        /// Delete every token record of a user.
        /// </summary>
        /// <param name="tenantId">Tenant identifier.</param>
        /// <param name="userId">User identifier.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Task.</returns>
        Task DeleteForUserAsync(string tenantId, string userId, CancellationToken token = default);

        /// <summary>
        /// Delete expired records.
        /// </summary>
        /// <param name="beforeUtc">Records that expired before this time are removed.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Records deleted.</returns>
        Task<int> DeleteExpiredAsync(DateTime beforeUtc, CancellationToken token = default);
    }
}
