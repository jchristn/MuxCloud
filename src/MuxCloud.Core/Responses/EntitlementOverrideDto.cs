namespace MuxCloud.Core.Responses
{
    using System;
    using System.Text.Json.Serialization;

    /// <summary>
    /// An entitlement override as returned by the admin override routes. limit and expiresUtc are always present (null
    /// when unlimited or not expiring).
    /// </summary>
    public class EntitlementOverrideDto
    {
        #region Public-Members

        /// <summary>
        /// Override identifier.
        /// </summary>
        [JsonPropertyName("id")]
        public string Id { get; set; } = String.Empty;

        /// <summary>
        /// Account.
        /// </summary>
        [JsonPropertyName("accountId")]
        public string AccountId { get; set; } = String.Empty;

        /// <summary>
        /// Feature key.
        /// </summary>
        [JsonPropertyName("featureKey")]
        public string FeatureKey { get; set; } = String.Empty;

        /// <summary>
        /// Limit; null is unlimited, 0 is disabled.
        /// </summary>
        [JsonPropertyName("limit")]
        [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
        public long? Limit { get; set; } = null;

        /// <summary>
        /// Why the override exists.
        /// </summary>
        [JsonPropertyName("reason")]
        public string Reason { get; set; } = String.Empty;

        /// <summary>
        /// When it stops applying, or null.
        /// </summary>
        [JsonPropertyName("expiresUtc")]
        [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
        public DateTime? ExpiresUtc { get; set; } = null;

        /// <summary>
        /// Creation time.
        /// </summary>
        [JsonPropertyName("createdUtc")]
        public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;

        #endregion
    }
}
