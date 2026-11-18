namespace MuxCloud.Core.Services.Implementations.Expo
{
    using System.Collections.Generic;
    using System.Text.Json.Serialization;

    /// <summary>
    /// Response of the Expo push send endpoint.
    /// </summary>
    public class ExpoPushResponse
    {
        #region Public-Members

        /// <summary>
        /// One ticket per message, in order.
        /// </summary>
        [JsonPropertyName("data")]
        public List<ExpoPushTicket>? Data { get; set; } = null;

        #endregion
    }
}
