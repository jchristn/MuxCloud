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
    /// User data access. Portable SQL; engine differences live in the dialect.
    /// Thread safety: safe to call concurrently.
    /// </summary>
    public class UserMethods : IUserMethods
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
        public UserMethods(DatabaseExecutor db)
        {
            ArgumentNullException.ThrowIfNull(db);
            _Db = db;
        }

        #endregion

        #region Public-Methods

        /// <inheritdoc />
        public async Task<User> CreateAsync(User user, CancellationToken token = default)
        {
            ArgumentNullException.ThrowIfNull(user);
            await _Db.ExecuteAsync(UserRow.Insert, UserRow.Parameters(user), token).ConfigureAwait(false);
            return user;
        }

        /// <inheritdoc />
        public Task<User?> ReadAsync(string id, CancellationToken token = default)
        {
            return _Db.QueryFirstAsync("SELECT " + UserRow.Columns + " FROM users WHERE id = @id", new SqlParameters().Add("id", id), UserRow.Map, token);
        }

        /// <inheritdoc />
        public Task<User?> ReadAsync(string tenantId, string id, CancellationToken token = default)
        {
            return _Db.QueryFirstAsync("SELECT " + UserRow.Columns + " FROM users WHERE tenant_id = @tenant_id AND id = @id", new SqlParameters().Add("tenant_id", tenantId).Add("id", id), UserRow.Map, token);
        }

        /// <inheritdoc />
        public Task<User?> ReadByEmailAsync(string emailNormalized, CancellationToken token = default)
        {
            return _Db.QueryFirstAsync("SELECT " + UserRow.Columns + " FROM users WHERE email_normalized = @e", new SqlParameters().Add("e", emailNormalized), UserRow.Map, token);
        }

        /// <inheritdoc />
        public async Task<User> UpdateAsync(User user, CancellationToken token = default)
        {
            ArgumentNullException.ThrowIfNull(user);
            user.LastUpdateUtc = DateTime.UtcNow;
            await _Db.ExecuteAsync(UserRow.Update, UserRow.Parameters(user), token).ConfigureAwait(false);
            return user;
        }

        /// <inheritdoc />
        public async Task DeleteAsync(string tenantId, string id, CancellationToken token = default)
        {
            await _Db.ExecuteAsync("DELETE FROM users WHERE tenant_id = @tenant_id AND id = @id", new SqlParameters().Add("tenant_id", tenantId).Add("id", id), token).ConfigureAwait(false);
        }

        /// <inheritdoc />
        public Task<PagedResult<User>> EnumerateAsync(string? emailContains, PageRequest page, CancellationToken token = default)
        {
            WhereBuilder where = new WhereBuilder().Contains(new[] { "email_normalized" }, "q", emailContains);
            return Paging.QueryAsync(_Db, "users" + where.Build(), UserRow.Columns, "created_utc DESC, id DESC", where.Parameters, page, UserRow.Map, token);
        }

        /// <inheritdoc />
        public Task<long> CountAsync(CancellationToken token = default)
        {
            return _Db.ScalarAsync("SELECT COUNT(*) FROM users", null, token);
        }

        #endregion
    }
}
