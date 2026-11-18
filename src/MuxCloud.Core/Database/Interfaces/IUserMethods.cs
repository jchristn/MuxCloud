namespace MuxCloud.Core.Database.Interfaces
{
    using System;
    using System.Collections.Generic;
    using System.Threading;
    using System.Threading.Tasks;
    using MuxCloud.Core.Models;

    /// <summary>
    /// User data access. Email is unique across the service.
    /// </summary>
    public interface IUserMethods
    {
        /// <summary>
        /// Create a user.
        /// </summary>
        /// <param name="user">User to create.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Created user.</returns>
        Task<User> CreateAsync(User user, CancellationToken token = default);

        /// <summary>
        /// Read a user by identifier (administrative).
        /// </summary>
        /// <param name="id">User identifier.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>User, or null.</returns>
        Task<User?> ReadAsync(string id, CancellationToken token = default);

        /// <summary>
        /// Read a user within a tenant.
        /// </summary>
        /// <param name="tenantId">Tenant identifier.</param>
        /// <param name="id">User identifier.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>User, or null.</returns>
        Task<User?> ReadAsync(string tenantId, string id, CancellationToken token = default);

        /// <summary>
        /// Read a user by normalized email.
        /// </summary>
        /// <param name="emailNormalized">Lower-case trimmed email.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>User, or null.</returns>
        Task<User?> ReadByEmailAsync(string emailNormalized, CancellationToken token = default);

        /// <summary>
        /// Update a user.
        /// </summary>
        /// <param name="user">User with changes.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Updated user.</returns>
        Task<User> UpdateAsync(User user, CancellationToken token = default);

        /// <summary>
        /// Delete a user.
        /// </summary>
        /// <param name="tenantId">Tenant identifier.</param>
        /// <param name="id">User identifier.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Task.</returns>
        Task DeleteAsync(string tenantId, string id, CancellationToken token = default);

        /// <summary>
        /// Enumerate users, newest first (administrative).
        /// </summary>
        /// <param name="emailContains">Case-insensitive email substring, or null.</param>
        /// <param name="page">Paging.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Page of users.</returns>
        Task<PagedResult<User>> EnumerateAsync(string? emailContains, PageRequest page, CancellationToken token = default);

        /// <summary>
        /// Count users.
        /// </summary>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Count.</returns>
        Task<long> CountAsync(CancellationToken token = default);
    }
}
