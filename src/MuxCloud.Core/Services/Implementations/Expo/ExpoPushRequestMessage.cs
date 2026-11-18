namespace MuxCloud.Core.Services.Implementations.Expo
{
    using System;
    using System.Collections.Generic;
    using System.Text.Json.Serialization;

    /// <summary>
    /// One message in an Expo push send request.
    /// </summary>
    public class ExpoPushRequestMessage
    {
        #region Public-Members

        /// <summary>
        /// Expo push token.
        /// </summary>
        [JsonPropertyName("to")]
        public string To { get; set; } = String.Empty;

        /// <summary>
        /// Title.
        /// </summary>
        [JsonPropertyName("title")]
        public string Title { get; set; } = String.Empty;

        /// <summary>
        /// Body.
        /// </summary>
        [JsonPropertyName("body")]
        public string Body { get; set; } = String.Empty;

        /// <summary>
        /// Data delivered to the app.
        /// </summary>
        [JsonPropertyName("data")]
        public Dictionary<string, string> Data { get; set; } = new Dictionary<string, string>();

        /// <summary>
        /// Sound.
        /// </summary>
        [JsonPropertyName("sound")]
        public string Sound { get; set; } = "default";

        /// <summary>
        /// Priority.
        /// </summary>
        [JsonPropertyName("priority")]
        public string Priority { get; set; } = "high";

        #endregion
    }
}
