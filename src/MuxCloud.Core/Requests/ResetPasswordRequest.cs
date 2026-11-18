namespace MuxCloud.Core.Requests
{
    using System;
    using System.Text.Json.Serialization;

    /// <summary>
    /// Body of POST /v1.0/api/auth/password/reset.
    /// </summary>
    public class ResetPasswordRequest
    {
        #region Public-Members

        /// <summary>
        /// Reset token.
        /// </summary>
        [JsonPropertyName("token")]
        public string? Token { get; set; } = null;

        /// <summary>
        /// New password.
        /// </summary>
        [JsonPropertyName("password")]
        public string? Password { get; set; } = null;

        #endregion
    }
}
