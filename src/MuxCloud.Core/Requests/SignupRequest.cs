namespace MuxCloud.Core.Requests
{
    using System;
    using System.Text.Json.Serialization;

    /// <summary>
    /// Body of POST /v1.0/api/auth/signup.
    /// </summary>
    public class SignupRequest
    {
        #region Public-Members

        /// <summary>
        /// Email address.
        /// </summary>
        [JsonPropertyName("email")]
        public string? Email { get; set; } = null;

        /// <summary>
        /// Password.
        /// </summary>
        [JsonPropertyName("password")]
        public string? Password { get; set; } = null;

        /// <summary>
        /// First name, optional.
        /// </summary>
        [JsonPropertyName("firstName")]
        public string? FirstName { get; set; } = null;

        /// <summary>
        /// Last name, optional.
        /// </summary>
        [JsonPropertyName("lastName")]
        public string? LastName { get; set; } = null;

        /// <summary>
        /// Must be true.
        /// </summary>
        [JsonPropertyName("acceptTerms")]
        public bool AcceptTerms { get; set; } = false;

        #endregion
    }
}
