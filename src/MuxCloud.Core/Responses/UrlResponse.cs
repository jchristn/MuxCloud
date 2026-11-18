namespace MuxCloud.Core.Responses
{
    using System;
    using System.Text.Json.Serialization;

    /// <summary>
    /// A URL to send the browser to.
    /// </summary>
    public class UrlResponse
    {
        #region Public-Members

        /// <summary>
        /// URL.
        /// </summary>
        [JsonPropertyName("url")]
        public string Url { get; set; } = String.Empty;

        #endregion
    }
}
