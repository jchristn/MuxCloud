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
    /// Entitlement override data access. Portable SQL; engine differences live in the dialect.
    /// Thread safety: safe to call concurrently.
    /// </summary>
    public class EntitlementOverrideMethods : IEntitlementOverrideMethods
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
        public EntitlementOverrideMethods(DatabaseExecutor db)
        {
            ArgumentNullException.ThrowIfNull(db);
            _Db = db;
        }

        #endregion

        #region Public-Methods

        /// <inheritdoc />
        public async Task<EntitlementOverride> CreateAsync(EntitlementOverride item, CancellationToken token = default)
        {
            ArgumentNullException.ThrowIfNull(item);
            await _Db.ExecuteAsync(EntitlementOverrideRow.Insert, EntitlementOverrideRow.Parameters(item), token).ConfigureAwait(false);
            return item;
        }

        /// <inheritdoc />
        public Task<List<EntitlementOverride>> EnumerateForAccountAsync(string accountId, CancellationToken token = default)
        {
            return _Db.QueryAsync("SELECT " + EntitlementOverrideRow.Columns + " FROM entitlement_overrides WHERE account_id = @a ORDER BY created_utc", new SqlParameters().Add("a", accountId), EntitlementOverrideRow.Map, token);
        }

        /// <inheritdoc />
        public async Task<bool> DeleteAsync(string accountId, string id, CancellationToken token = default)
        {
            int rows = await _Db.ExecuteAsync("DELETE FROM entitlement_overrides WHERE account_id = @a AND id = @id", new SqlParameters().Add("a", accountId).Add("id", id), token).ConfigureAwait(false);
            return rows > 0;
        }

        /// <inheritdoc />
        public async Task DeleteForAccountAsync(string accountId, CancellationToken token = default)
        {
            await _Db.ExecuteAsync("DELETE FROM entitlement_overrides WHERE account_id = @a", new SqlParameters().Add("a", accountId), token).ConfigureAwait(false);
        }

        #endregion
    }
}
