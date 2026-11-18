namespace MuxCloud.Core.Requests
{
    using System;
    using System.Text.Json.Serialization;

    /// <summary>
    /// Body of POST /v1.0/api/billing/checkout.
    /// </summary>
    public class CheckoutRequest
    {
        #region Public-Members

        /// <summary>
        /// Plan to buy.
        /// </summary>
        [JsonPropertyName("planCode")]
        public string? PlanCode { get; set; } = null;

        #endregion
    }
}
