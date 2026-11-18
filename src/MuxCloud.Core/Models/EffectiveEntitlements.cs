namespace MuxCloud.Core.Models
{
    using System;
    using System.Collections.Generic;
    using System.Text.Json.Serialization;

    /// <summary>
    /// Every feature in effect for an account: active subscriptions merged with overrides.
    /// </summary>
    public class EffectiveEntitlements
    {
        #region Public-Members

        /// <summary>
        /// Account.
        /// </summary>
        [JsonPropertyName("accountId")]
        public string AccountId { get; set; } = String.Empty;

        /// <summary>
        /// Code of the primary active plan, or empty.
        /// </summary>
        [JsonPropertyName("planCode")]
        public string PlanCode { get; set; } = String.Empty;

        /// <summary>
        /// Features, one per known key.
        /// </summary>
        [JsonPropertyName("features")]
        public List<EntitlementFeature> Features { get; set; } = new List<EntitlementFeature>();

        #endregion
    }
}
