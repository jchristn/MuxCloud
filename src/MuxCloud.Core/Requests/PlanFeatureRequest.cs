namespace MuxCloud.Core.Requests
{
    using System;
    using System.Text.Json.Serialization;

    /// <summary>
    /// One feature in a plan save request.
    /// </summary>
    public class PlanFeatureRequest
    {
        #region Public-Members

        /// <summary>
        /// Feature key.
        /// </summary>
        [JsonPropertyName("key")]
        public string? Key { get; set; } = null;

        /// <summary>
        /// Limit; null is unlimited, 0 is disabled.
        /// </summary>
        [JsonPropertyName("limit")]
        public long? Limit { get; set; } = null;

        #endregion
    }
}
