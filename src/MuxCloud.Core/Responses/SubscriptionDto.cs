namespace MuxCloud.Core.Responses
{
    using System;
    using System.Text.Json.Serialization;

    /// <summary>
    /// A subscription.
    /// </summary>
    public class SubscriptionDto
    {
        #region Public-Members

        /// <summary>
        /// Subscription identifier.
        /// </summary>
        [JsonPropertyName("id")]
        public string Id { get; set; } = String.Empty;

        /// <summary>
        /// Plan.
        /// </summary>
        [JsonPropertyName("planId")]
        public string PlanId { get; set; } = String.Empty;

        /// <summary>
        /// Plan code.
        /// </summary>
        [JsonPropertyName("planCode")]
        public string PlanCode { get; set; } = String.Empty;

        /// <summary>
        /// Status.
        /// </summary>
        [JsonPropertyName("status")]
        public string Status { get; set; } = String.Empty;

        /// <summary>
        /// Provider.
        /// </summary>
        [JsonPropertyName("provider")]
        public string Provider { get; set; } = String.Empty;

        /// <summary>
        /// Period end.
        /// </summary>
        [JsonPropertyName("currentPeriodEndUtc")]
        public DateTime? CurrentPeriodEndUtc { get; set; } = null;

        /// <summary>
        /// Ends at period end.
        /// </summary>
        [JsonPropertyName("cancelAtPeriodEnd")]
        public bool CancelAtPeriodEnd { get; set; } = false;

        /// <summary>
        /// Created.
        /// </summary>
        [JsonPropertyName("createdUtc")]
        public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;

        #endregion
    }
}
