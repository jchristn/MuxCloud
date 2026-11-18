namespace MuxCloud.Core.Responses
{
    using System;
    using System.Text.Json.Serialization;

    /// <summary>
    /// A connection history row.
    /// </summary>
    public class MachineConnectionDto
    {
        #region Public-Members

        /// <summary>
        /// Connection identifier.
        /// </summary>
        [JsonPropertyName("id")]
        public string Id { get; set; } = String.Empty;

        /// <summary>
        /// Machine.
        /// </summary>
        [JsonPropertyName("machineId")]
        public string MachineId { get; set; } = String.Empty;

        /// <summary>
        /// Server node.
        /// </summary>
        [JsonPropertyName("nodeId")]
        public string NodeId { get; set; } = String.Empty;

        /// <summary>
        /// Machine IP.
        /// </summary>
        [JsonPropertyName("remoteIp")]
        public string RemoteIp { get; set; } = String.Empty;

        /// <summary>
        /// Protocol version.
        /// </summary>
        [JsonPropertyName("protocolVersion")]
        public int ProtocolVersion { get; set; } = 0;

        /// <summary>
        /// mux version.
        /// </summary>
        [JsonPropertyName("muxVersion")]
        public string MuxVersion { get; set; } = String.Empty;

        /// <summary>
        /// Connected.
        /// </summary>
        [JsonPropertyName("connectedUtc")]
        public DateTime ConnectedUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Disconnected.
        /// </summary>
        [JsonPropertyName("disconnectedUtc")]
        public DateTime? DisconnectedUtc { get; set; } = null;

        /// <summary>
        /// Close code.
        /// </summary>
        [JsonPropertyName("closeCode")]
        public int? CloseCode { get; set; } = null;

        /// <summary>
        /// Close reason.
        /// </summary>
        [JsonPropertyName("closeReason")]
        public string CloseReason { get; set; } = String.Empty;

        /// <summary>
        /// Bytes from the machine.
        /// </summary>
        [JsonPropertyName("bytesIn")]
        public long BytesIn { get; set; } = 0;

        /// <summary>
        /// Bytes to the machine.
        /// </summary>
        [JsonPropertyName("bytesOut")]
        public long BytesOut { get; set; } = 0;

        #endregion
    }
}
