namespace MuxCloud.Core.Services.Implementations.Expo
{
    using System.Text.Json.Serialization;

    /// <summary>
    /// Details of a failed Expo push ticket.
    /// </summary>
    public class ExpoPushTicketDetails
    {
        #region Public-Members

        /// <summary>
        /// Error code, for example DeviceNotRegistered.
        /// </summary>
        [JsonPropertyName("error")]
        public string? Error { get; set; } = null;

        #endregion
    }
}
