namespace MuxCloud.Core.Responses
{
    using System;
    using System.Text.Json.Serialization;

    /// <summary>
    /// Response of POST /v1.0/api/ws-tickets.
    /// </summary>
    public class WsTicketResponse
    {
        #region Public-Members

        /// <summary>
        /// Single-use ticket.
        /// </summary>
        [JsonPropertyName("ticket")]
        public string Ticket { get; set; } = String.Empty;

        /// <summary>
        /// Expiry.
        /// </summary>
        [JsonPropertyName("expiresUtc")]
        public DateTime ExpiresUtc { get; set; } = DateTime.UtcNow;

        #endregion
    }
}
