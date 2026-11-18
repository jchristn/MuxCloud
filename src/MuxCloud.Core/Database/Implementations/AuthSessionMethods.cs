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
    /// Sign-in session data access. Portable SQL; engine differences live in the dialect.
    /// Thread safety: safe to call concurrently.
    /// </summary>
    public class AuthSessionMethods : IAuthSessionMethods
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
        public AuthSessionMethods(DatabaseExecutor db)
        {
            ArgumentNullException.ThrowIfNull(db);
            _Db = db;
        }

        #endregion

        #region Public-Methods

        /// <inheritdoc />
        public async Task<AuthSession> CreateAsync(AuthSession session, CancellationToken token = default)
        {
            ArgumentNullException.ThrowIfNull(session);
            await _Db.ExecuteAsync(AuthSessionRow.Insert, AuthSessionRow.Parameters(session), token).ConfigureAwait(false);
            return session;
        }

        /// <inheritdoc />
        public Task<AuthSession?> ReadAsync(string id, CancellationToken token = default)
        {
            return _Db.QueryFirstAsync("SELECT " + AuthSessionRow.Columns + " FROM auth_sessions WHERE id = @id", new SqlParameters().Add("id", id), AuthSessionRow.Map, token);
        }

        /// <inheritdoc />
        public Task<AuthSession?> ReadByRefreshHashAsync(string hash, CancellationToken token = default)
        {
            return _Db.QueryFirstAsync("SELECT " + AuthSessionRow.Columns + " FROM auth_sessions WHERE refresh_token_hash = @h", new SqlParameters().Add("h", hash), AuthSessionRow.Map, token);
        }

        /// <inheritdoc />
        public Task<AuthSession?> ReadByPreviousRefreshHashAsync(string hash, CancellationToken token = default)
        {
            return _Db.QueryFirstAsync("SELECT " + AuthSessionRow.Columns + " FROM auth_sessions WHERE previous_refresh_token_hash = @h", new SqlParameters().Add("h", hash), AuthSessionRow.Map, token);
        }

        /// <inheritdoc />
        public async Task<AuthSession> UpdateAsync(AuthSession session, CancellationToken token = default)
        {
            ArgumentNullException.ThrowIfNull(session);
            await _Db.ExecuteAsync(AuthSessionRow.Update, AuthSessionRow.Parameters(session), token).ConfigureAwait(false);
            return session;
        }

        /// <inheritdoc />
        public async Task TouchAsync(string id, DateTime lastUsedUtc, CancellationToken token = default)
        {
            await _Db.ExecuteAsync("UPDATE auth_sessions SET last_used_utc = @t WHERE id = @id", new SqlParameters().Add("t", lastUsedUtc).Add("id", id), token).ConfigureAwait(false);
        }

        /// <inheritdoc />
        public Task<int> RevokeAllForUserAsync(string tenantId, string userId, string? exceptSessionId, string reason, DateTime revokedUtc, CancellationToken token = default)
        {
            SqlParameters p = new SqlParameters().Add("tenant_id", tenantId).Add("user_id", userId).Add("reason", reason ?? String.Empty).Add("t", revokedUtc).Add("except", exceptSessionId ?? String.Empty);
            return _Db.ExecuteAsync("UPDATE auth_sessions SET revoked_utc = @t, revocation_reason = @reason WHERE tenant_id = @tenant_id AND user_id = @user_id AND revoked_utc IS NULL AND id <> @except", p, token);
        }

        /// <inheritdoc />
        public Task<PagedResult<AuthSession>> EnumerateActiveAsync(string tenantId, string userId, DateTime nowUtc, PageRequest page, CancellationToken token = default)
        {
            WhereBuilder where = new WhereBuilder()
                .Add("tenant_id = @tenant_id", "tenant_id", tenantId)
                .Add("user_id = @user_id", "user_id", userId)
                .Add("revoked_utc IS NULL")
                .Add("refresh_expires_utc > @now", "now", nowUtc);
            return Paging.QueryAsync(_Db, "auth_sessions" + where.Build(), AuthSessionRow.Columns, "created_utc DESC, id DESC", where.Parameters, page, AuthSessionRow.Map, token);
        }

        /// <inheritdoc />
        public async Task DeleteForUserAsync(string tenantId, string userId, CancellationToken token = default)
        {
            await _Db.ExecuteAsync("DELETE FROM auth_sessions WHERE tenant_id = @tenant_id AND user_id = @user_id", new SqlParameters().Add("tenant_id", tenantId).Add("user_id", userId), token).ConfigureAwait(false);
        }

        #endregion
    }
}
