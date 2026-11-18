namespace MuxCloud.Core.Requests
{
    using System;
    using System.Text.Json.Serialization;

    /// <summary>
    /// Body of PUT /v1.0/api/admin/users/{id}. Null fields are unchanged.
    /// </summary>
    public class AdminUserUpdateRequest
    {
        #region Public-Members

        /// <summary>
        /// Whether the user may sign in.
        /// </summary>
        [JsonPropertyName("active")]
        public bool? Active { get; set; } = null;

        /// <summary>
        /// System administrator.
        /// </summary>
        [JsonPropertyName("isAdmin")]
        public bool? IsAdmin { get; set; } = null;

        /// <summary>
        /// Mark the email verified or unverified.
        /// </summary>
        [JsonPropertyName("emailVerified")]
        public bool? EmailVerified { get; set; } = null;

        /// <summary>
        /// First name.
        /// </summary>
        [JsonPropertyName("firstName")]
        public string? FirstName { get; set; } = null;

        /// <summary>
        /// Last name.
        /// </summary>
        [JsonPropertyName("lastName")]
        public string? LastName { get; set; } = null;

        #endregion
    }
}
