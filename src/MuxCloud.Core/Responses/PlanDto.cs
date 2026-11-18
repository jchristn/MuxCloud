namespace MuxCloud.Core.Responses
{
    using System;
    using System.Collections.Generic;
    using System.Text.Json.Serialization;

    /// <summary>
    /// A plan.
    /// </summary>
    public class PlanDto
    {
        #region Public-Members

        /// <summary>
        /// Plan identifier.
        /// </summary>
        [JsonPropertyName("id")]
        public string Id { get; set; } = String.Empty;

        /// <summary>
        /// Code.
        /// </summary>
        [JsonPropertyName("code")]
        public string Code { get; set; } = String.Empty;

        /// <summary>
        /// Name.
        /// </summary>
        [JsonPropertyName("name")]
        public string Name { get; set; } = String.Empty;

        /// <summary>
        /// Price in cents.
        /// </summary>
        [JsonPropertyName("priceCents")]
        public long PriceCents { get; set; } = 0;

        /// <summary>
        /// Currency.
        /// </summary>
        [JsonPropertyName("currency")]
        public string Currency { get; set; } = "usd";

        /// <summary>
        /// Interval.
        /// </summary>
        [JsonPropertyName("interval")]
        public string Interval { get; set; } = "month";

        /// <summary>
        /// Active.
        /// </summary>
        [JsonPropertyName("active")]
        public bool Active { get; set; } = true;

        /// <summary>
        /// Public.
        /// </summary>
        [JsonPropertyName("public")]
        public bool Public { get; set; } = true;

        /// <summary>
        /// Features.
        /// </summary>
        [JsonPropertyName("features")]
        public List<PlanFeatureDto> Features { get; set; } = new List<PlanFeatureDto>();

        #endregion
    }
}
