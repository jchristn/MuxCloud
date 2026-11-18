namespace MuxCloud.Core.Responses
{
    using System;
    using System.Text.Json.Serialization;

    /// <summary>
    /// Response of login and refresh.
    /// </summary>
    public class LoginResponse
    {
        #region Public-Members

        /// <summary>
        /// Session identifier.
        /// </summary>
        [JsonPropertyName("sessionId")]
        public string SessionId { get; set; } = String.Empty;

        /// <summary>
        /// Signed-in user.
        /// </summary>
        [JsonPropertyName("user")]
        public UserDto User { get; set; } = new UserDto();

        /// <summary>
        /// Access token (mobile clients only).
        /// </summary>
        [JsonPropertyName("accessToken")]
        public string? AccessToken { get; set; } = null;

        /// <summary>
        /// Access token expiry.
        /// </summary>
        [JsonPropertyName("accessTokenExpiresUtc")]
        public DateTime AccessTokenExpiresUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Refresh token (mobile clients only).
        /// </summary>
        [JsonPropertyName("refreshToken")]
        public string? RefreshToken { get; set; } = null;

        /// <summary>
        /// Refresh token expiry.
        /// </summary>
        [JsonPropertyName("refreshTokenExpiresUtc")]
        public DateTime RefreshTokenExpiresUtc { get; set; } = DateTime.UtcNow;

        #endregion
    }
}
