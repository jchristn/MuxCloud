namespace MuxCloud.Core.Requests
{
    using System;
    using System.Text.Json.Serialization;

    /// <summary>
    /// Body of POST /v1.0/api/admin/accounts/{accountId}/overrides.
    /// </summary>
    public class OverrideCreateRequest
    {
        #region Public-Members

        /// <summary>
        /// Feature key.
        /// </summary>
        [JsonPropertyName("featureKey")]
        public string? FeatureKey { get; set; } = null;

        /// <summary>
        /// Limit; null is unlimited, 0 is disabled.
        /// </summary>
        [JsonPropertyName("limit")]
        public long? Limit { get; set; } = null;

        /// <summary>
        /// Why.
        /// </summary>
        [JsonPropertyName("reason")]
        public string? Reason { get; set; } = null;

        /// <summary>
        /// Expiry, or null.
        /// </summary>
        [JsonPropertyName("expiresUtc")]
        public DateTime? ExpiresUtc { get; set; } = null;

        #endregion
    }
}
