namespace MuxCloud.Protocol
{
    using System;
    using System.Collections.Generic;

    /// <summary>
    /// Envelope type discriminators carried in <see cref="TunnelEnvelope.Type"/>.
    /// Thread safety: immutable; safe to share.
    /// </summary>
    public static class TunnelMessageTypes
    {
        #region Public-Members

        /// <summary>
        /// Machine to cloud. First frame on every connection. Carries <see cref="TunnelEnvelope.Hello"/>.
        /// </summary>
        public const string Hello = "tunnel.hello";

        /// <summary>
        /// Cloud to machine. Handshake accepted. Carries <see cref="TunnelEnvelope.Welcome"/>.
        /// </summary>
        public const string Welcome = "tunnel.welcome";

        /// <summary>
        /// Either direction. Heartbeat request. Carries <see cref="TunnelEnvelope.Ping"/>.
        /// </summary>
        public const string Ping = "tunnel.ping";

        /// <summary>
        /// Either direction. Heartbeat reply echoing the ping nonce. Carries <see cref="TunnelEnvelope.Ping"/>.
        /// </summary>
        public const string Pong = "tunnel.pong";

        /// <summary>
        /// Cloud to machine. The server is draining; reconnect after the given delay. Carries <see cref="TunnelEnvelope.GoAway"/>.
        /// </summary>
        public const string GoAway = "tunnel.goaway";

        /// <summary>
        /// Cloud to machine. Relayed HTTP request. <see cref="TunnelEnvelope.Id"/> is the stream identifier.
        /// </summary>
        public const string HttpRequest = "http.request";

        /// <summary>
        /// Machine to cloud. Status and headers of a relayed response.
        /// </summary>
        public const string HttpResponseStart = "http.response.start";

        /// <summary>
        /// Machine to cloud. A piece of a relayed response body.
        /// </summary>
        public const string HttpResponseChunk = "http.response.chunk";

        /// <summary>
        /// Machine to cloud. A relayed response is complete.
        /// </summary>
        public const string HttpResponseEnd = "http.response.end";

        /// <summary>
        /// Cloud to machine. Abort a relayed request (the client went away or timed out).
        /// </summary>
        public const string HttpCancel = "http.cancel";

        /// <summary>
        /// Cloud to machine. Open a relayed WebSocket channel. <see cref="TunnelEnvelope.Id"/> is the channel identifier.
        /// </summary>
        public const string WsOpen = "ws.open";

        /// <summary>
        /// Machine to cloud. The relayed WebSocket channel is open on the machine.
        /// </summary>
        public const string WsOpened = "ws.opened";

        /// <summary>
        /// Either direction. A text message on a relayed WebSocket channel.
        /// </summary>
        public const string WsFrame = "ws.frame";

        /// <summary>
        /// Either direction. Close a relayed WebSocket channel.
        /// </summary>
        public const string WsClose = "ws.close";

        /// <summary>
        /// Machine to cloud. A relayed stream or channel failed. Carries <see cref="TunnelEnvelope.Error"/>.
        /// </summary>
        public const string StreamError = "stream.error";

        /// <summary>
        /// Machine to cloud. Status push (version, name, active runs, approval waiting). Carries <see cref="TunnelEnvelope.MachineStatus"/>.
        /// </summary>
        public const string MachineStatus = "machine.status";

        /// <summary>
        /// Every type defined by this protocol version.
        /// </summary>
        public static readonly IReadOnlyList<string> All = new List<string>
        {
            Hello, Welcome, Ping, Pong, GoAway,
            HttpRequest, HttpResponseStart, HttpResponseChunk, HttpResponseEnd, HttpCancel,
            WsOpen, WsOpened, WsFrame, WsClose,
            StreamError, MachineStatus
        };

        #endregion

        #region Public-Methods

        /// <summary>
        /// Whether a type is defined by this protocol version. Receivers ignore unknown types for forward compatibility.
        /// </summary>
        /// <param name="type">Type discriminator; null is unknown.</param>
        /// <returns>True when known.</returns>
        public static bool IsKnown(string? type)
        {
            if (String.IsNullOrEmpty(type)) return false;
            foreach (string known in All)
            {
                if (String.Equals(known, type, StringComparison.Ordinal)) return true;
            }

            return false;
        }

        #endregion
    }
}
