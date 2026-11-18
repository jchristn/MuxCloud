namespace MuxCloud.Protocol
{
    using System;
    using System.Text.Json.Serialization;

    /// <summary>
    /// One tunnel message: a JSON text frame. <see cref="Type"/> selects which payload property is set; every other payload
    /// property is null. <see cref="Id"/> is the stream identifier for <c>http.*</c> types and the channel identifier for
    /// <c>ws.*</c> types.
    /// </summary>
    public class TunnelEnvelope
    {
        #region Public-Members

        /// <summary>
        /// Type discriminator (see <see cref="TunnelMessageTypes"/>).
        /// </summary>
        [JsonPropertyName("type")]
        public string Type
        {
            get { return _Type; }
            set { _Type = value ?? String.Empty; }
        }

        /// <summary>
        /// Stream or channel identifier, or null for connection-level messages.
        /// </summary>
        [JsonPropertyName("id")]
        public string? Id { get; set; } = null;

        /// <summary>
        /// When the sender created the message, UTC.
        /// </summary>
        [JsonPropertyName("timestampUtc")]
        public DateTime TimestampUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Payload of <see cref="TunnelMessageTypes.Hello"/>.
        /// </summary>
        [JsonPropertyName("hello")]
        public TunnelHelloPayload? Hello { get; set; } = null;

        /// <summary>
        /// Payload of <see cref="TunnelMessageTypes.Welcome"/>.
        /// </summary>
        [JsonPropertyName("welcome")]
        public TunnelWelcomePayload? Welcome { get; set; } = null;

        /// <summary>
        /// Payload of <see cref="TunnelMessageTypes.Ping"/> and <see cref="TunnelMessageTypes.Pong"/>.
        /// </summary>
        [JsonPropertyName("ping")]
        public TunnelPingPayload? Ping { get; set; } = null;

        /// <summary>
        /// Payload of <see cref="TunnelMessageTypes.GoAway"/>.
        /// </summary>
        [JsonPropertyName("goAway")]
        public TunnelGoAwayPayload? GoAway { get; set; } = null;

        /// <summary>
        /// Payload of <see cref="TunnelMessageTypes.HttpRequest"/>.
        /// </summary>
        [JsonPropertyName("httpRequest")]
        public HttpRequestPayload? HttpRequest { get; set; } = null;

        /// <summary>
        /// Payload of <see cref="TunnelMessageTypes.HttpResponseStart"/>.
        /// </summary>
        [JsonPropertyName("httpResponseStart")]
        public HttpResponseStartPayload? HttpResponseStart { get; set; } = null;

        /// <summary>
        /// Payload of <see cref="TunnelMessageTypes.HttpResponseChunk"/>.
        /// </summary>
        [JsonPropertyName("httpChunk")]
        public HttpChunkPayload? HttpChunk { get; set; } = null;

        /// <summary>
        /// Payload of <see cref="TunnelMessageTypes.WsOpen"/>.
        /// </summary>
        [JsonPropertyName("wsOpen")]
        public WsOpenPayload? WsOpen { get; set; } = null;

        /// <summary>
        /// Payload of <see cref="TunnelMessageTypes.WsFrame"/>.
        /// </summary>
        [JsonPropertyName("wsFrame")]
        public WsFramePayload? WsFrame { get; set; } = null;

        /// <summary>
        /// Payload of <see cref="TunnelMessageTypes.WsClose"/>.
        /// </summary>
        [JsonPropertyName("wsClose")]
        public WsClosePayload? WsClose { get; set; } = null;

        /// <summary>
        /// Payload of <see cref="TunnelMessageTypes.StreamError"/>.
        /// </summary>
        [JsonPropertyName("error")]
        public TunnelErrorPayload? Error { get; set; } = null;

        /// <summary>
        /// Payload of <see cref="TunnelMessageTypes.MachineStatus"/>.
        /// </summary>
        [JsonPropertyName("machineStatus")]
        public MachineStatusPayload? MachineStatus { get; set; } = null;

        #endregion

        #region Private-Members

        private string _Type = String.Empty;

        #endregion
    }
}
