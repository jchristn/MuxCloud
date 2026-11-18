namespace MuxCloud.Protocol
{
    using System.Collections.Generic;

    /// <summary>
    /// Capability names exchanged in the handshake. A side only uses a feature both sides advertise.
    /// Thread safety: immutable; safe to share.
    /// </summary>
    public static class TunnelCapabilities
    {
        #region Public-Members

        /// <summary>
        /// Relayed HTTP requests and responses.
        /// </summary>
        public const string HttpRelay = "http.relay";

        /// <summary>
        /// Streamed HTTP response bodies (server-sent events pass through as chunks).
        /// </summary>
        public const string HttpStreaming = "http.streaming";

        /// <summary>
        /// Cancellation of in-flight relayed requests.
        /// </summary>
        public const string HttpCancel = "http.cancel";

        /// <summary>
        /// Relayed WebSocket channels.
        /// </summary>
        public const string WsRelay = "ws.relay";

        /// <summary>
        /// Machine status pushes.
        /// </summary>
        public const string MachineStatus = "machine.status";

        /// <summary>
        /// Every capability defined by this protocol version.
        /// </summary>
        public static readonly IReadOnlyList<string> All = new List<string> { HttpRelay, HttpStreaming, HttpCancel, WsRelay, MachineStatus };

        #endregion
    }
}
