namespace MuxCloud.Core.Responses
{
    using System;
    using System.Text.Json.Serialization;

    /// <summary>
    /// Health body.
    /// </summary>
    public class HealthResponse
    {
        #region Public-Members

        /// <summary>
        /// healthy.
        /// </summary>
        [JsonPropertyName("status")]
        public string Status { get; set; } = "healthy";

        /// <summary>
        /// Product.
        /// </summary>
        [JsonPropertyName("product")]
        public string Product { get; set; } = "MuxCloud";

        /// <summary>
        /// Version.
        /// </summary>
        [JsonPropertyName("version")]
        public string Version { get; set; } = String.Empty;

        /// <summary>
        /// Server time.
        /// </summary>
        [JsonPropertyName("utc")]
        public DateTime Utc { get; set; } = DateTime.UtcNow;

        #endregion
    }
}
