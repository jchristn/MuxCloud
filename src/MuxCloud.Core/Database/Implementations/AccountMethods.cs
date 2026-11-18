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
    /// Account data access. Portable SQL; engine differences live in the dialect.
    /// Thread safety: safe to call concurrently.
    /// </summary>
    public class AccountMethods : IAccountMethods
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
        public AccountMethods(DatabaseExecutor db)
        {
            ArgumentNullException.ThrowIfNull(db);
            _Db = db;
        }

        #endregion

        #region Public-Methods

        /// <inheritdoc />
        public async Task<Account> CreateAsync(Account account, CancellationToken token = default)
        {
            ArgumentNullException.ThrowIfNull(account);
            await _Db.ExecuteAsync(AccountRow.Insert, AccountRow.Parameters(account), token).ConfigureAwait(false);
            return account;
        }

        /// <inheritdoc />
        public Task<Account?> ReadAsync(string id, CancellationToken token = default)
        {
            return _Db.QueryFirstAsync("SELECT " + AccountRow.Columns + " FROM accounts WHERE id = @id", new SqlParameters().Add("id", id), AccountRow.Map, token);
        }

        /// <inheritdoc />
        public async Task<Account> UpdateAsync(Account account, CancellationToken token = default)
        {
            ArgumentNullException.ThrowIfNull(account);
            account.LastUpdateUtc = DateTime.UtcNow;
            await _Db.ExecuteAsync(AccountRow.Update, AccountRow.Parameters(account), token).ConfigureAwait(false);
            return account;
        }

        /// <inheritdoc />
        public async Task DeleteAsync(string id, CancellationToken token = default)
        {
            await _Db.ExecuteAsync("DELETE FROM accounts WHERE id = @id", new SqlParameters().Add("id", id), token).ConfigureAwait(false);
        }

        #endregion
    }
}
