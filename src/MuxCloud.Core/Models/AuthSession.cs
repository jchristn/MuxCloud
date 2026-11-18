namespace MuxCloud.Core.Models
{
    using System;
    using MuxCloud.Core.Helpers;

    /// <summary>
    /// A sign-in session. Access tokens reference it; refresh tokens rotate within it.
    /// </summary>
    public class AuthSession
    {
        #region Public-Members

        /// <summary>
        /// Session identifier (prefix ses_).
        /// </summary>
        public string Id { get; set; } = IdGenerator.NewId(Constants.SessionPrefix);

        /// <summary>
        /// Tenant.
        /// </summary>
        public string TenantId { get; set; } = String.Empty;

        /// <summary>
        /// User.
        /// </summary>
        public string UserId { get; set; } = String.Empty;

        /// <summary>
        /// Client kind: web or mobile.
        /// </summary>
        public string Client { get; set; } = "web";

        /// <summary>
        /// Label shown in the session list.
        /// </summary>
        public string DeviceName { get; set; } = String.Empty;

        /// <summary>
        /// IP address at sign in.
        /// </summary>
        public string SourceIp { get; set; } = String.Empty;

        /// <summary>
        /// User agent at sign in.
        /// </summary>
        public string UserAgent { get; set; } = String.Empty;

        /// <summary>
        /// SHA-256 hex of the current refresh token.
        /// </summary>
        public string RefreshTokenHash { get; set; } = String.Empty;

        /// <summary>
        /// SHA-256 hex of the previous refresh token, kept to detect reuse.
        /// </summary>
        public string PreviousRefreshTokenHash { get; set; } = String.Empty;

        /// <summary>
        /// When the refresh token expires.
        /// </summary>
        public DateTime RefreshExpiresUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Last use of the session.
        /// </summary>
        public DateTime LastUsedUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// When the session was revoked, or null.
        /// </summary>
        public DateTime? RevokedUtc { get; set; } = null;

        /// <summary>
        /// Why the session was revoked.
        /// </summary>
        public string RevocationReason { get; set; } = String.Empty;

        /// <summary>
        /// Creation time, UTC.
        /// </summary>
        public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;

        #endregion
    }
}
