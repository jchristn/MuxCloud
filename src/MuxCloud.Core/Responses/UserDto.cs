namespace MuxCloud.Core.Responses
{
    using System;
    using System.Text.Json.Serialization;

    /// <summary>
    /// A user as returned by the API.
    /// </summary>
    public class UserDto
    {
        #region Public-Members

        /// <summary>
        /// User identifier.
        /// </summary>
        [JsonPropertyName("id")]
        public string Id { get; set; } = String.Empty;

        /// <summary>
        /// Email.
        /// </summary>
        [JsonPropertyName("email")]
        public string Email { get; set; } = String.Empty;

        /// <summary>
        /// First name.
        /// </summary>
        [JsonPropertyName("firstName")]
        public string FirstName { get; set; } = String.Empty;

        /// <summary>
        /// Last name.
        /// </summary>
        [JsonPropertyName("lastName")]
        public string LastName { get; set; } = String.Empty;

        /// <summary>
        /// Whether the email is verified.
        /// </summary>
        [JsonPropertyName("emailVerified")]
        public bool EmailVerified { get; set; } = false;

        /// <summary>
        /// System administrator.
        /// </summary>
        [JsonPropertyName("isAdmin")]
        public bool IsAdmin { get; set; } = false;

        /// <summary>
        /// Whether the user may sign in.
        /// </summary>
        [JsonPropertyName("active")]
        public bool Active { get; set; } = true;

        /// <summary>
        /// Tenant.
        /// </summary>
        [JsonPropertyName("tenantId")]
        public string TenantId { get; set; } = String.Empty;

        /// <summary>
        /// Account.
        /// </summary>
        [JsonPropertyName("accountId")]
        public string AccountId { get; set; } = String.Empty;

        /// <summary>
        /// Last login.
        /// </summary>
        [JsonPropertyName("lastLoginUtc")]
        public DateTime? LastLoginUtc { get; set; } = null;

        /// <summary>
        /// Creation time.
        /// </summary>
        [JsonPropertyName("createdUtc")]
        public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;

        #endregion
    }
}
