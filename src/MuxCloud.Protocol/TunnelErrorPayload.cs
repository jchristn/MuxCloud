namespace MuxCloud.Protocol
{
    using System;
    using System.Text.Json.Serialization;

    /// <summary>
    /// A relayed stream or channel failed (<see cref="TunnelMessageTypes.StreamError"/>).
    /// </summary>
    public class TunnelErrorPayload
    {
        #region Public-Members

        /// <summary>
        /// Stable error code (see <see cref="TunnelErrorCodes"/>).
        /// </summary>
        [JsonPropertyName("code")]
        public string Code
        {
            get { return _Code; }
            set { _Code = String.IsNullOrWhiteSpace(value) ? TunnelErrorCodes.InternalError : value; }
        }

        /// <summary>
        /// Human-readable message with context.
        /// </summary>
        [JsonPropertyName("message")]
        public string Message
        {
            get { return _Message; }
            set { _Message = value ?? String.Empty; }
        }

        /// <summary>
        /// HTTP status the cloud should return to the client when no response has started. Default 502, minimum 400, maximum 599.
        /// </summary>
        [JsonPropertyName("statusCode")]
        public int StatusCode
        {
            get { return _StatusCode; }
            set { _StatusCode = Math.Clamp(value, 400, 599); }
        }

        #endregion

        #region Private-Members

        private string _Code = TunnelErrorCodes.InternalError;
        private string _Message = String.Empty;
        private int _StatusCode = 502;

        #endregion
    }
}
