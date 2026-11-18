namespace MuxCloud.Core.Requests
{
    using System;
    using System.Text.Json.Serialization;

    /// <summary>
    /// Body of POST /v1.0/api/auth/refresh. Browsers send the refresh cookie instead.
    /// </summary>
    public class RefreshRequest
    {
        #region Public-Members

        /// <summary>
        /// Refresh token, or null to use the cookie.
        /// </summary>
        [JsonPropertyName("refreshToken")]
        public string? RefreshToken { get; set; } = null;

        #endregion
    }
}
