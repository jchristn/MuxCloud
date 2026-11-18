namespace MuxCloud.Core.Models
{
    using System;
    using MuxCloud.Core.Helpers;

    /// <summary>
    /// A user. Email is unique across the whole service (a recorded departure from per-tenant uniqueness).
    /// </summary>
    public class User
    {
        #region Public-Members

        /// <summary>
        /// User identifier (prefix usr_).
        /// </summary>
        public string Id { get; set; } = IdGenerator.NewId(Constants.UserPrefix);

        /// <summary>
        /// Tenant the user belongs to.
        /// </summary>
        public string TenantId { get; set; } = String.Empty;

        /// <summary>
        /// Account the user belongs to.
        /// </summary>
        public string AccountId { get; set; } = String.Empty;

        /// <summary>
        /// Email address as entered.
        /// </summary>
        public string Email { get; set; } = String.Empty;

        /// <summary>
        /// Lower-case trimmed email, unique.
        /// </summary>
        public string EmailNormalized { get; set; } = String.Empty;

        /// <summary>
        /// First name.
        /// </summary>
        public string FirstName { get; set; } = String.Empty;

        /// <summary>
        /// Last name.
        /// </summary>
        public string LastName { get; set; } = String.Empty;

        /// <summary>
        /// Base64 PBKDF2 hash.
        /// </summary>
        public string PasswordHash { get; set; } = String.Empty;

        /// <summary>
        /// Base64 per-user salt.
        /// </summary>
        public string PasswordSalt { get; set; } = String.Empty;

        /// <summary>
        /// Hash algorithm identifier, for example pbkdf2-sha256.
        /// </summary>
        public string PasswordAlgorithm { get; set; } = String.Empty;

        /// <summary>
        /// Iteration count used for the stored hash.
        /// </summary>
        public int PasswordIterations { get; set; } = 0;

        /// <summary>
        /// When the email address was verified, or null.
        /// </summary>
        public DateTime? EmailVerifiedUtc { get; set; } = null;

        /// <summary>
        /// Terms version accepted at signup.
        /// </summary>
        public string TermsVersion { get; set; } = String.Empty;

        /// <summary>
        /// When the terms were accepted, or null.
        /// </summary>
        public DateTime? TermsAcceptedUtc { get; set; } = null;

        /// <summary>
        /// System administrator.
        /// </summary>
        public bool IsAdmin { get; set; } = false;

        /// <summary>
        /// Administrator of their own tenant.
        /// </summary>
        public bool IsTenantAdmin { get; set; } = true;

        /// <summary>
        /// Whether the user may sign in.
        /// </summary>
        public bool Active { get; set; } = true;

        /// <summary>
        /// Whether the user is protected from deletion (seed admin).
        /// </summary>
        public bool IsProtected { get; set; } = false;

        /// <summary>
        /// Last successful login, or null.
        /// </summary>
        public DateTime? LastLoginUtc { get; set; } = null;

        /// <summary>
        /// Creation time, UTC.
        /// </summary>
        public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Last update time, UTC.
        /// </summary>
        public DateTime LastUpdateUtc { get; set; } = DateTime.UtcNow;

        #endregion
    }
}
