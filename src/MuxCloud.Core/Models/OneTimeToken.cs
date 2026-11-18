namespace MuxCloud.Core.Models
{
    using System;
    using MuxCloud.Core.Enums;
    using MuxCloud.Core.Helpers;

    /// <summary>
    /// A single-use token for email verification or password reset. Only a hash of the token is stored.
    /// </summary>
    public class OneTimeToken
    {
        #region Public-Members

        /// <summary>
        /// Token record identifier (prefix ott_).
        /// </summary>
        public string Id { get; set; } = IdGenerator.NewId(Constants.OneTimeTokenPrefix);

        /// <summary>
        /// Tenant.
        /// </summary>
        public string TenantId { get; set; } = String.Empty;

        /// <summary>
        /// User.
        /// </summary>
        public string UserId { get; set; } = String.Empty;

        /// <summary>
        /// What the token is for.
        /// </summary>
        public OneTimeTokenPurposeEnum Purpose { get; set; } = OneTimeTokenPurposeEnum.EmailVerification;

        /// <summary>
        /// SHA-256 hex of the token value.
        /// </summary>
        public string TokenHash { get; set; } = String.Empty;

        /// <summary>
        /// Expiry, UTC.
        /// </summary>
        public DateTime ExpiresUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// When the token was used, or null.
        /// </summary>
        public DateTime? UsedUtc { get; set; } = null;

        /// <summary>
        /// Creation time, UTC.
        /// </summary>
        public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;

        #endregion
    }
}
