namespace MuxCloud.Core.Database.Interfaces
{
    using System;
    using System.Collections.Generic;
    using System.Threading;
    using System.Threading.Tasks;
    using MuxCloud.Core.Models;

    /// <summary>
    /// Subscription data access.
    /// </summary>
    public interface ISubscriptionMethods
    {
        /// <summary>
        /// Create a subscription.
        /// </summary>
        /// <param name="subscription">Subscription to create.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Created subscription.</returns>
        Task<Subscription> CreateAsync(Subscription subscription, CancellationToken token = default);

        /// <summary>
        /// Update a subscription.
        /// </summary>
        /// <param name="subscription">Subscription with changes.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Updated subscription.</returns>
        Task<Subscription> UpdateAsync(Subscription subscription, CancellationToken token = default);

        /// <summary>
        /// Every subscription of an account, newest first.
        /// </summary>
        /// <param name="accountId">Account identifier.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Subscriptions.</returns>
        Task<List<Subscription>> EnumerateForAccountAsync(string accountId, CancellationToken token = default);

        /// <summary>
        /// Delete every subscription of an account.
        /// </summary>
        /// <param name="accountId">Account identifier.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Task.</returns>
        Task DeleteForAccountAsync(string accountId, CancellationToken token = default);
    }
}
