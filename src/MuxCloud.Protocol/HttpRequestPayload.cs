namespace MuxCloud.Protocol
{
    using System;
    using System.Collections.Generic;
    using System.Text.Json.Serialization;

    /// <summary>
    /// A relayed HTTP request (<see cref="TunnelMessageTypes.HttpRequest"/>). The path is the machine-local path, with the
    /// <c>/m/{machineId}</c> prefix already removed.
    /// </summary>
    public class HttpRequestPayload
    {
        #region Public-Members

        /// <summary>
        /// HTTP method, upper case.
        /// </summary>
        [JsonPropertyName("method")]
        public string Method
        {
            get { return _Method; }
            set { _Method = String.IsNullOrWhiteSpace(value) ? "GET" : value.Trim().ToUpperInvariant(); }
        }

        /// <summary>
        /// Machine-local absolute path, for example <c>/v1.0/api/sessions</c>.
        /// </summary>
        [JsonPropertyName("path")]
        public string Path
        {
            get { return _Path; }
            set { _Path = String.IsNullOrEmpty(value) ? "/" : value; }
        }

        /// <summary>
        /// Raw query string without the leading question mark, or empty.
        /// </summary>
        [JsonPropertyName("query")]
        public string Query
        {
            get { return _Query; }
            set { _Query = (value ?? String.Empty).TrimStart('?'); }
        }

        /// <summary>
        /// Request headers that survive relay filtering. Multiple values are joined with a comma.
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

        /// <summary>
        /// Base64-encoded request body, or empty.
        /// </summary>
        [JsonPropertyName("bodyBase64")]
        public string BodyBase64
        {
            get { return _BodyBase64; }
            set { _BodyBase64 = value ?? String.Empty; }
        }

        /// <summary>
        /// IP address of the remote client, for the machine's logs.
        /// </summary>
        [JsonPropertyName("requesterIp")]
        public string RequesterIp
        {
            get { return _RequesterIp; }
            set { _RequesterIp = value ?? String.Empty; }
        }

        #endregion

        #region Private-Members

        private string _Method = "GET";
        private string _Path = "/";
        private string _Query = String.Empty;
        private Dictionary<string, string> _Headers = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        private string _ContentType = String.Empty;
        private string _BodyBase64 = String.Empty;
        private string _RequesterIp = String.Empty;

        #endregion
    }
}
