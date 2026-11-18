namespace MuxCloud.Protocol
{
    using System;
    using System.Text.Json.Serialization;

    /// <summary>
    /// A piece of a relayed response body (<see cref="TunnelMessageTypes.HttpResponseChunk"/>).
    /// </summary>
    public class HttpChunkPayload
    {
        #region Public-Members

        /// <summary>
        /// Base64-encoded bytes. Senders keep each chunk at or under <see cref="TunnelProtocol.MaxChunkBytes"/> before encoding.
        /// </summary>
        [JsonPropertyName("data")]
        public string Data
        {
            get { return _Data; }
            set { _Data = value ?? String.Empty; }
        }

        #endregion

        #region Private-Members

        private string _Data = String.Empty;

        #endregion
    }
}
