namespace MuxCloud.Core.Responses
{
    using System;
    using System.Text.Json.Serialization;

    /// <summary>
    /// A plan feature.
    /// </summary>
    public class PlanFeatureDto
    {
        #region Public-Members

        /// <summary>
        /// Feature key.
        /// </summary>
        [JsonPropertyName("key")]
        public string Key { get; set; } = String.Empty;

        /// <summary>
        /// Limit; null is unlimited.
        /// </summary>
        [JsonPropertyName("limit")]
        public long? Limit { get; set; } = null;

        #endregion
    }
}
