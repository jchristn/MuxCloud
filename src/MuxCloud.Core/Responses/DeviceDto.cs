namespace MuxCloud.Core.Responses
{
    using System;
    using System.Text.Json.Serialization;

    /// <summary>
    /// A device as returned by the API (no push token).
    /// </summary>
    public class DeviceDto
    {
        #region Public-Members

        /// <summary>
        /// Device identifier.
        /// </summary>
        [JsonPropertyName("id")]
        public string Id { get; set; } = String.Empty;

        /// <summary>
        /// ios or android.
        /// </summary>
        [JsonPropertyName("platform")]
        public string Platform { get; set; } = String.Empty;

        /// <summary>
        /// Display name.
        /// </summary>
        [JsonPropertyName("name")]
        public string Name { get; set; } = String.Empty;

        /// <summary>
        /// Registration time.
        /// </summary>
        [JsonPropertyName("createdUtc")]
        public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;

        #endregion
    }
}
