namespace MuxCloud.Core.Database.Interfaces
{
    using System;
    using System.Collections.Generic;
    using System.Threading;
    using System.Threading.Tasks;
    using MuxCloud.Core.Models;

    /// <summary>
    /// Account data access. Accounts are the global billing owners.
    /// </summary>
    public interface IAccountMethods
    {
        /// <summary>
        /// Create an account.
        /// </summary>
        /// <param name="account">Account to create.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Created account.</returns>
        Task<Account> CreateAsync(Account account, CancellationToken token = default);

        /// <summary>
        /// Read an account.
        /// </summary>
        /// <param name="id">Account identifier.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Account, or null.</returns>
        Task<Account?> ReadAsync(string id, CancellationToken token = default);

        /// <summary>
        /// Update an account.
        /// </summary>
        /// <param name="account">Account with changes.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Updated account.</returns>
        Task<Account> UpdateAsync(Account account, CancellationToken token = default);

        /// <summary>
        /// Delete an account.
        /// </summary>
        /// <param name="id">Account identifier.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Task.</returns>
        Task DeleteAsync(string id, CancellationToken token = default);
    }
}
