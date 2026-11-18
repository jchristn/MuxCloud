namespace MuxCloud.Core.Requests
{
    using System;
    using System.Collections.Generic;
    using System.Text.Json.Serialization;

    /// <summary>
    /// Body of POST and PUT /v1.0/api/admin/plans.
    /// </summary>
    public class PlanSaveRequest
    {
        #region Public-Members

        /// <summary>
        /// Plan code.
        /// </summary>
        [JsonPropertyName("code")]
        public string? Code { get; set; } = null;

        /// <summary>
        /// Display name.
        /// </summary>
        [JsonPropertyName("name")]
        public string? Name { get; set; } = null;

        /// <summary>
        /// Price in cents.
        /// </summary>
        [JsonPropertyName("priceCents")]
        public long PriceCents { get; set; } = 0;

        /// <summary>
        /// Currency code.
        /// </summary>
        [JsonPropertyName("currency")]
        public string? Currency { get; set; } = null;

        /// <summary>
        /// month or year.
        /// </summary>
        [JsonPropertyName("interval")]
        public string? Interval { get; set; } = null;

        /// <summary>
        /// Whether the plan can be subscribed to.
        /// </summary>
        [JsonPropertyName("active")]
        public bool Active { get; set; } = true;

        /// <summary>
        /// Whether the plan is listed publicly.
        /// </summary>
        [JsonPropertyName("public")]
        public bool Public { get; set; } = true;

        /// <summary>
        /// Features.
        /// </summary>
        [JsonPropertyName("features")]
        public List<PlanFeatureRequest> Features { get; set; } = new List<PlanFeatureRequest>();

        #endregion
    }
}
