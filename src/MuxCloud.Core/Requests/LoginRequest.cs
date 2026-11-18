namespace MuxCloud.Core.Requests
{
    using System;
    using System.Text.Json.Serialization;

    /// <summary>
    /// Body of POST /v1.0/api/auth/login.
    /// </summary>
    public class LoginRequest
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
        /// web (default, cookies) or mobile (tokens in the body).
        /// </summary>
        [JsonPropertyName("client")]
        public string? Client { get; set; } = null;

        /// <summary>
        /// Label for the session list, optional.
        /// </summary>
        [JsonPropertyName("deviceName")]
        public string? DeviceName { get; set; } = null;

        #endregion
    }
}
