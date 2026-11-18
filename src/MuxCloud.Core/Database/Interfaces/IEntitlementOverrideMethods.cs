namespace MuxCloud.Core.Database.Interfaces
{
    using System;
    using System.Collections.Generic;
    using System.Threading;
    using System.Threading.Tasks;
    using MuxCloud.Core.Models;

    /// <summary>
    /// Entitlement override data access.
    /// </summary>
    public interface IEntitlementOverrideMethods
    {
        /// <summary>
        /// Create an override.
        /// </summary>
        /// <param name="item">Override to create.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Created override.</returns>
        Task<EntitlementOverride> CreateAsync(EntitlementOverride item, CancellationToken token = default);

        /// <summary>
        /// Every override of an account.
        /// </summary>
        /// <param name="accountId">Account identifier.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Overrides.</returns>
        Task<List<EntitlementOverride>> EnumerateForAccountAsync(string accountId, CancellationToken token = default);

        /// <summary>
        /// Delete an override.
        /// </summary>
        /// <param name="accountId">Account identifier.</param>
        /// <param name="id">Override identifier.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>True if one was deleted.</returns>
        Task<bool> DeleteAsync(string accountId, string id, CancellationToken token = default);

        /// <summary>
        /// Delete every override of an account.
        /// </summary>
        /// <param name="accountId">Account identifier.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Task.</returns>
        Task DeleteForAccountAsync(string accountId, CancellationToken token = default);
    }
}
