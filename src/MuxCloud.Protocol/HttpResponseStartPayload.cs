namespace MuxCloud.Protocol
{
    using System;
    using System.Collections.Generic;
    using System.Text.Json.Serialization;

    /// <summary>
    /// Status line and headers of a relayed response (<see cref="TunnelMessageTypes.HttpResponseStart"/>). Body bytes follow as
    /// <see cref="TunnelMessageTypes.HttpResponseChunk"/> frames and the stream finishes with <see cref="TunnelMessageTypes.HttpResponseEnd"/>.
    /// </summary>
    public class HttpResponseStartPayload
    {
        #region Public-Members

        /// <summary>
        /// HTTP status code. Default 200, minimum 100, maximum 599.
        /// </summary>
        [JsonPropertyName("statusCode")]
        public int StatusCode
        {
            get { return _StatusCode; }
            set { _StatusCode = Math.Clamp(value, 100, 599); }
        }

        /// <summary>
        /// Response headers that survive relay filtering.
        /// </summary>
        [JsonPropertyName("headers")]
        public Dictionary<string, string> Headers
        {
            get { return _Headers; }
            set { _Headers = value ?? new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase); }
        }

        /// <summary>
        /// Content type of the body, or empty.
        /// </summary>
        [JsonPropertyName("contentType")]
        public string ContentType
        {
            get { return _ContentType; }
            set { _ContentType = value ?? String.Empty; }
        }

        #endregion

        #region Private-Members

        private int _StatusCode = 200;
        private Dictionary<string, string> _Headers = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        private string _ContentType = String.Empty;

        #endregion
    }
}
