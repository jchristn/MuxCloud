namespace MuxCloud.Core.Responses
{
    using System;
    using System.Text.Json.Serialization;

    /// <summary>
    /// A session as returned by the API.
    /// </summary>
    public class SessionDto
    {
        #region Public-Members

        /// <summary>
        /// Session identifier.
        /// </summary>
        [JsonPropertyName("id")]
        public string Id { get; set; } = String.Empty;

        /// <summary>
        /// web or mobile.
        /// </summary>
        [JsonPropertyName("client")]
        public string Client { get; set; } = String.Empty;

        /// <summary>
        /// Label.
        /// </summary>
        [JsonPropertyName("deviceName")]
        public string DeviceName { get; set; } = String.Empty;

        /// <summary>
        /// IP at sign in.
        /// </summary>
        [JsonPropertyName("sourceIp")]
        public string SourceIp { get; set; } = String.Empty;

        /// <summary>
        /// User agent at sign in.
        /// </summary>
        [JsonPropertyName("userAgent")]
        public string UserAgent { get; set; } = String.Empty;

        /// <summary>
        /// Creation time.
        /// </summary>
        [JsonPropertyName("createdUtc")]
        public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Last use.
        /// </summary>
        [JsonPropertyName("lastUsedUtc")]
        public DateTime LastUsedUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Refresh expiry.
        /// </summary>
        [JsonPropertyName("expiresUtc")]
        public DateTime ExpiresUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Whether this is the calling session.
        /// </summary>
        [JsonPropertyName("current")]
        public bool Current { get; set; } = false;

        #endregion
    }
}
