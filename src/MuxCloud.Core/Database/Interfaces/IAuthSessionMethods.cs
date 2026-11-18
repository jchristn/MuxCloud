namespace MuxCloud.Core.Database.Interfaces
{
    using System;
    using System.Collections.Generic;
    using System.Threading;
    using System.Threading.Tasks;
    using MuxCloud.Core.Models;

    /// <summary>
    /// Sign-in session data access.
    /// </summary>
    public interface IAuthSessionMethods
    {
        /// <summary>
        /// Create a session.
        /// </summary>
        /// <param name="session">Session to create.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Created session.</returns>
        Task<AuthSession> CreateAsync(AuthSession session, CancellationToken token = default);

        /// <summary>
        /// Read a session.
        /// </summary>
        /// <param name="id">Session identifier.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Session, or null.</returns>
        Task<AuthSession?> ReadAsync(string id, CancellationToken token = default);

        /// <summary>
        /// Read the session whose current refresh token has this hash.
        /// </summary>
        /// <param name="hash">SHA-256 hex of a refresh token.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Session, or null.</returns>
        Task<AuthSession?> ReadByRefreshHashAsync(string hash, CancellationToken token = default);

        /// <summary>
        /// Read the session whose previous refresh token has this hash (reuse detection).
        /// </summary>
        /// <param name="hash">SHA-256 hex of a refresh token.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Session, or null.</returns>
        Task<AuthSession?> ReadByPreviousRefreshHashAsync(string hash, CancellationToken token = default);

        /// <summary>
        /// Update a session.
        /// </summary>
        /// <param name="session">Session with changes.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Updated session.</returns>
        Task<AuthSession> UpdateAsync(AuthSession session, CancellationToken token = default);

        /// <summary>
        /// Record use of a session.
        /// </summary>
        /// <param name="id">Session identifier.</param>
        /// <param name="lastUsedUtc">Time of use.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Task.</returns>
        Task TouchAsync(string id, DateTime lastUsedUtc, CancellationToken token = default);

        /// <summary>
        /// Revoke every active session of a user.
        /// </summary>
        /// <param name="tenantId">Tenant identifier.</param>
        /// <param name="userId">User identifier.</param>
        /// <param name="exceptSessionId">Session to keep, or null.</param>
        /// <param name="reason">Revocation reason.</param>
        /// <param name="revokedUtc">Revocation time.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Sessions revoked.</returns>
        Task<int> RevokeAllForUserAsync(string tenantId, string userId, string? exceptSessionId, string reason, DateTime revokedUtc, CancellationToken token = default);

        /// <summary>
        /// Enumerate a user's sessions that are neither revoked nor expired, newest first.
        /// </summary>
        /// <param name="tenantId">Tenant identifier.</param>
        /// <param name="userId">User identifier.</param>
        /// <param name="nowUtc">Current time.</param>
        /// <param name="page">Paging.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Page of sessions.</returns>
        Task<PagedResult<AuthSession>> EnumerateActiveAsync(string tenantId, string userId, DateTime nowUtc, PageRequest page, CancellationToken token = default);

        /// <summary>
        /// Delete every session of a user.
        /// </summary>
        /// <param name="tenantId">Tenant identifier.</param>
        /// <param name="userId">User identifier.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Task.</returns>
        Task DeleteForUserAsync(string tenantId, string userId, CancellationToken token = default);
    }
}
