namespace MuxCloud.Protocol
{
    using System;
    using System.Collections.Generic;
    using System.Text.Json.Serialization;

    /// <summary>
    /// Open a relayed WebSocket channel on the machine (<see cref="TunnelMessageTypes.WsOpen"/>).
    /// </summary>
    public class WsOpenPayload
    {
        #region Public-Members

        /// <summary>
        /// Machine-local path, for example <c>/v1.0/ws</c>.
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
        /// Subprotocols requested by the client.
        /// </summary>
        [JsonPropertyName("subprotocols")]
        public List<string> Subprotocols
        {
            get { return _Subprotocols; }
            set { _Subprotocols = value ?? new List<string>(); }
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

        private string _Path = "/";
        private string _Query = String.Empty;
        private List<string> _Subprotocols = new List<string>();
        private string _RequesterIp = String.Empty;

        #endregion
    }
}
