namespace MuxCloud.Core.Models
{
    using System;
    using System.Text.Json.Serialization;

    /// <summary>
    /// One effective feature for an account.
    /// </summary>
    public class EntitlementFeature
    {
        #region Public-Members

        /// <summary>
        /// Feature key.
        /// </summary>
        [JsonPropertyName("key")]
        public string Key { get; set; } = String.Empty;

        /// <summary>
        /// Whether the feature is enabled.
        /// </summary>
        [JsonPropertyName("enabled")]
        public bool Enabled { get; set; } = false;

        /// <summary>
        /// Limit; null is unlimited.
        /// </summary>
        [JsonPropertyName("limit")]
        public long? Limit { get; set; } = null;

        #endregion
    }
}
