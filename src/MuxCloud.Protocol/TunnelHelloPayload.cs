namespace MuxCloud.Protocol
{
    using System;
    using System.Collections.Generic;
    using System.Text.Json.Serialization;

    /// <summary>
    /// Handshake sent by the machine as the first frame on every tunnel connection.
    /// </summary>
    public class TunnelHelloPayload
    {
        #region Public-Members

        /// <summary>
        /// Machine identifier issued at enrollment (prefix <c>mch_</c>).
        /// </summary>
        [JsonPropertyName("machineId")]
        public string MachineId
        {
            get { return _MachineId; }
            set { _MachineId = value ?? String.Empty; }
        }

        /// <summary>
        /// Protocol version the machine speaks. Default <see cref="TunnelProtocol.CurrentVersion"/>.
        /// </summary>
        [JsonPropertyName("protocolVersion")]
        public int ProtocolVersion { get; set; } = TunnelProtocol.CurrentVersion;

        /// <summary>
        /// Installed mux version, for display and compatibility decisions.
        /// </summary>
        [JsonPropertyName("muxVersion")]
        public string MuxVersion
        {
            get { return _MuxVersion; }
            set { _MuxVersion = value ?? String.Empty; }
        }

        /// <summary>
        /// Display name chosen on the machine.
        /// </summary>
        [JsonPropertyName("machineName")]
        public string MachineName
        {
            get { return _MachineName; }
            set { _MachineName = value ?? String.Empty; }
        }

        /// <summary>
        /// Host name of the machine.
        /// </summary>
        [JsonPropertyName("hostname")]
        public string Hostname
        {
            get { return _Hostname; }
            set { _Hostname = value ?? String.Empty; }
        }

        /// <summary>
        /// Operating system description, for example "macOS 26.0 arm64".
        /// </summary>
        [JsonPropertyName("os")]
        public string Os
        {
            get { return _Os; }
            set { _Os = value ?? String.Empty; }
        }

        /// <summary>
        /// Capabilities the machine supports (see <see cref="TunnelCapabilities"/>).
        /// </summary>
        [JsonPropertyName("capabilities")]
        public List<string> Capabilities
        {
            get { return _Capabilities; }
            set { _Capabilities = value ?? new List<string>(); }
        }

        /// <summary>
        /// Proof timestamp, round-trip ("O") UTC format. Must be within the server's allowed clock skew.
        /// </summary>
        [JsonPropertyName("timestampUtc")]
        public string TimestampUtc
        {
            get { return _TimestampUtc; }
            set { _TimestampUtc = value ?? String.Empty; }
        }

        /// <summary>
        /// Random single-use nonce (lowercase hex). Replays are rejected.
        /// </summary>
        [JsonPropertyName("nonce")]
        public string Nonce
        {
            get { return _Nonce; }
            set { _Nonce = value ?? String.Empty; }
        }

        /// <summary>
        /// Proof of possession of the machine secret (see <see cref="TunnelProof.ComputeProof"/>).
        /// </summary>
        [JsonPropertyName("proof")]
        public string Proof
        {
            get { return _Proof; }
            set { _Proof = value ?? String.Empty; }
        }

        #endregion

        #region Private-Members

        private string _MachineId = String.Empty;
        private string _MuxVersion = String.Empty;
        private string _MachineName = String.Empty;
        private string _Hostname = String.Empty;
        private string _Os = String.Empty;
        private List<string> _Capabilities = new List<string>();
        private string _TimestampUtc = String.Empty;
        private string _Nonce = String.Empty;
        private string _Proof = String.Empty;

        #endregion
    }
}
