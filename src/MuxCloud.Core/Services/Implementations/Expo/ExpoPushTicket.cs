namespace MuxCloud.Core.Services.Implementations.Expo
{
    using System.Text.Json.Serialization;

    /// <summary>
    /// One Expo push ticket.
    /// </summary>
    public class ExpoPushTicket
    {
        #region Public-Members

        /// <summary>
        /// ok or error.
        /// </summary>
        [JsonPropertyName("status")]
        public string? Status { get; set; } = null;

        /// <summary>
        /// Ticket identifier when ok.
        /// </summary>
        [JsonPropertyName("id")]
        public string? Id { get; set; } = null;

        /// <summary>
        /// Error message when error.
        /// </summary>
        [JsonPropertyName("message")]
        public string? Message { get; set; } = null;

        /// <summary>
        /// Error details when error.
        /// </summary>
        [JsonPropertyName("details")]
        public ExpoPushTicketDetails? Details { get; set; } = null;

        #endregion
    }
}
