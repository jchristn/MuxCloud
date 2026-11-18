namespace MuxCloud.Core.Database.Implementations
{
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Threading;
    using System.Threading.Tasks;
    using MuxCloud.Core.Database.Implementations.Rows;
    using MuxCloud.Core.Database.Interfaces;
    using MuxCloud.Core.Models;

    /// <summary>
    /// Subscription data access. Portable SQL; engine differences live in the dialect.
    /// Thread safety: safe to call concurrently.
    /// </summary>
    public class SubscriptionMethods : ISubscriptionMethods
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
        public SubscriptionMethods(DatabaseExecutor db)
        {
            ArgumentNullException.ThrowIfNull(db);
            _Db = db;
        }

        #endregion

        #region Public-Methods

        /// <inheritdoc />
        public async Task<Subscription> CreateAsync(Subscription subscription, CancellationToken token = default)
        {
            ArgumentNullException.ThrowIfNull(subscription);
            await _Db.ExecuteAsync(SubscriptionRow.Insert, SubscriptionRow.Parameters(subscription), token).ConfigureAwait(false);
            return subscription;
        }

        /// <inheritdoc />
        public async Task<Subscription> UpdateAsync(Subscription subscription, CancellationToken token = default)
        {
            ArgumentNullException.ThrowIfNull(subscription);
            subscription.LastUpdateUtc = DateTime.UtcNow;
            await _Db.ExecuteAsync(SubscriptionRow.Update, SubscriptionRow.Parameters(subscription), token).ConfigureAwait(false);
            return subscription;
        }

        /// <inheritdoc />
        public Task<List<Subscription>> EnumerateForAccountAsync(string accountId, CancellationToken token = default)
        {
            return _Db.QueryAsync("SELECT " + SubscriptionRow.Columns + " FROM subscriptions WHERE account_id = @a ORDER BY created_utc DESC", new SqlParameters().Add("a", accountId), SubscriptionRow.Map, token);
        }

        /// <inheritdoc />
        public async Task DeleteForAccountAsync(string accountId, CancellationToken token = default)
        {
            await _Db.ExecuteAsync("DELETE FROM subscriptions WHERE account_id = @a", new SqlParameters().Add("a", accountId), token).ConfigureAwait(false);
        }

        #endregion
    }
}
