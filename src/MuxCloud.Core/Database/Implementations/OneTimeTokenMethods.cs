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
    /// One-time token data access. Portable SQL; engine differences live in the dialect.
    /// Thread safety: safe to call concurrently.
    /// </summary>
    public class OneTimeTokenMethods : IOneTimeTokenMethods
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
        public OneTimeTokenMethods(DatabaseExecutor db)
        {
            ArgumentNullException.ThrowIfNull(db);
            _Db = db;
        }

        #endregion

        #region Public-Methods

        /// <inheritdoc />
        public async Task<OneTimeToken> CreateAsync(OneTimeToken item, CancellationToken token = default)
        {
            ArgumentNullException.ThrowIfNull(item);
            await _Db.ExecuteAsync(OneTimeTokenRow.Insert, OneTimeTokenRow.Parameters(item), token).ConfigureAwait(false);
            return item;
        }

        /// <inheritdoc />
        public Task<OneTimeToken?> ReadByHashAsync(string tokenHash, CancellationToken token = default)
        {
            return _Db.QueryFirstAsync("SELECT " + OneTimeTokenRow.Columns + " FROM one_time_tokens WHERE token_hash = @h", new SqlParameters().Add("h", tokenHash), OneTimeTokenRow.Map, token);
        }

        /// <inheritdoc />
        public async Task<bool> MarkUsedAsync(string id, DateTime usedUtc, CancellationToken token = default)
        {
            int rows = await _Db.ExecuteAsync("UPDATE one_time_tokens SET used_utc = @t WHERE id = @id AND used_utc IS NULL", new SqlParameters().Add("t", usedUtc).Add("id", id), token).ConfigureAwait(false);
            return rows > 0;
        }

        /// <inheritdoc />
        public async Task DeleteForUserAsync(string tenantId, string userId, CancellationToken token = default)
        {
            await _Db.ExecuteAsync("DELETE FROM one_time_tokens WHERE tenant_id = @tenant_id AND user_id = @user_id", new SqlParameters().Add("tenant_id", tenantId).Add("user_id", userId), token).ConfigureAwait(false);
        }

        /// <inheritdoc />
        public Task<int> DeleteExpiredAsync(DateTime beforeUtc, CancellationToken token = default)
        {
            return _Db.ExecuteAsync("DELETE FROM one_time_tokens WHERE expires_utc < @t", new SqlParameters().Add("t", beforeUtc), token);
        }

        #endregion
    }
}
