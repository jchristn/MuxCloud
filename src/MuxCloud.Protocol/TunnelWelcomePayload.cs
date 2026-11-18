namespace MuxCloud.Protocol
{
    using System;
    using System.Collections.Generic;
    using System.Text.Json.Serialization;

    /// <summary>
    /// Handshake acceptance sent by the cloud. The machine counts as online only after receiving it.
    /// </summary>
    public class TunnelWelcomePayload
    {
        #region Public-Members

        /// <summary>
        /// Identifier of this connection (prefix <c>mcn_</c>). A newer connection for the same machine replaces it.
        /// </summary>
        [JsonPropertyName("connectionId")]
        public string ConnectionId
        {
            get { return _ConnectionId; }
            set { _ConnectionId = value ?? String.Empty; }
        }

        /// <summary>
        /// Protocol version the server selected for this connection.
        /// </summary>
        [JsonPropertyName("protocolVersion")]
        public int ProtocolVersion { get; set; } = TunnelProtocol.CurrentVersion;

        /// <summary>
        /// Mux Cloud server version.
        /// </summary>
        [JsonPropertyName("serverVersion")]
        public string ServerVersion
        {
            get { return _ServerVersion; }
            set { _ServerVersion = value ?? String.Empty; }
        }

        /// <summary>
        /// Heartbeat interval both sides use, in seconds. Default 20, minimum 5, maximum 300.
        /// </summary>
        [JsonPropertyName("heartbeatSeconds")]
        public int HeartbeatSeconds
        {
            get { return _HeartbeatSeconds; }
            set { _HeartbeatSeconds = Math.Clamp(value, 5, 300); }
        }

        /// <summary>
        /// Largest relayed request body the server sends, in bytes. Default 8 MiB.
        /// </summary>
        [JsonPropertyName("maxRequestBodyBytes")]
        public long MaxRequestBodyBytes
        {
            get { return _MaxRequestBodyBytes; }
            set { _MaxRequestBodyBytes = Math.Max(0, value); }
        }

        /// <summary>
        /// Largest number of concurrent streams and channels the server opens on this tunnel. Default 32, minimum 1.
        /// </summary>
        [JsonPropertyName("maxConcurrentStreams")]
        public int MaxConcurrentStreams
        {
            get { return _MaxConcurrentStreams; }
            set { _MaxConcurrentStreams = Math.Max(1, value); }
        }

        /// <summary>
        /// Capabilities enabled for this connection: the intersection of both sides.
        /// </summary>
        [JsonPropertyName("capabilities")]
        public List<string> Capabilities
        {
            get { return _Capabilities; }
            set { _Capabilities = value ?? new List<string>(); }
        }

        /// <summary>
        /// Display name the cloud holds for this machine (it may have been renamed in the dashboard).
        /// </summary>
        [JsonPropertyName("machineName")]
        public string MachineName
        {
            get { return _MachineName; }
            set { _MachineName = value ?? String.Empty; }
        }

        #endregion

        #region Private-Members

        private string _ConnectionId = String.Empty;
        private string _ServerVersion = String.Empty;
        private int _HeartbeatSeconds = 20;
        private long _MaxRequestBodyBytes = 8L * 1024 * 1024;
        private int _MaxConcurrentStreams = 32;
        private List<string> _Capabilities = new List<string>();
        private string _MachineName = String.Empty;

        #endregion
    }
}
