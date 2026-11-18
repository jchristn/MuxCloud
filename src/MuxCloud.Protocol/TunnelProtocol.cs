namespace MuxCloud.Protocol
{
    using System;
    using System.Collections.Generic;
    using System.Text.Json;

    /// <summary>
    /// Protocol constants, serialization, and envelope factories shared by Mux Cloud and the mux tunnel client.
    /// Thread safety: stateless; safe to call concurrently.
    /// </summary>
    public static class TunnelProtocol
    {
        #region Public-Members

        /// <summary>
        /// Protocol version this package implements.
        /// </summary>
        public const int CurrentVersion = 1;

        /// <summary>
        /// Oldest protocol version this package can talk to.
        /// </summary>
        public const int MinimumSupportedVersion = 1;

        /// <summary>
        /// Tunnel WebSocket path on the cloud server.
        /// </summary>
        public const string TunnelPath = "/v1.0/tunnel";

        /// <summary>
        /// Machine enrollment REST path on the cloud server.
        /// </summary>
        public const string EnrollPath = "/v1.0/api/machines/enroll";

        /// <summary>
        /// REST path a machine calls to sign itself out (anonymous; authenticated by a sign-out proof).
        /// </summary>
        public const string SignOutPath = "/v1.0/api/machines/sign-out";

        /// <summary>
        /// Production Mux Cloud URL, the default for mux's <c>cloud.serverUrl</c>.
        /// </summary>
        public const string DefaultServerUrl = "https://app.usemux.ai";

        /// <summary>
        /// Prefix of relayed paths on the cloud server: <c>/m/{machineId}/...</c>.
        /// </summary>
        public const string MachinePathPrefix = "/m/";

        /// <summary>
        /// Header the machine adds to loopback requests it forwards from the tunnel.
        /// </summary>
        public const string RelayHeader = "X-Mux-Relay";

        /// <summary>
        /// Value of <see cref="RelayHeader"/>.
        /// </summary>
        public const string RelayHeaderValue = "cloud";

        /// <summary>
        /// Header the machine adds to loopback requests with the cloud path prefix, for example <c>/m/mch_abc</c>, so pages it
        /// renders build URLs that route back through the relay.
        /// </summary>
        public const string BasePathHeader = "X-Mux-Base-Path";

        /// <summary>
        /// Largest body chunk, in raw bytes before base64, a sender puts in one <see cref="HttpChunkPayload"/>.
        /// </summary>
        public const int MaxChunkBytes = 64 * 1024;

        /// <summary>
        /// Allowed clock skew for handshake timestamps, in seconds.
        /// </summary>
        public const int HandshakeSkewSeconds = 120;

        /// <summary>
        /// Serializer options for tunnel frames: camelCase, nulls omitted, case-insensitive reads (source generated).
        /// </summary>
        public static JsonSerializerOptions JsonOptions
        {
            get { return TunnelJsonContext.Default.Options; }
        }

        #endregion

        #region Public-Methods

        /// <summary>
        /// Serialize an envelope to a JSON text frame.
        /// </summary>
        /// <param name="envelope">Envelope.</param>
        /// <returns>JSON.</returns>
        /// <exception cref="ArgumentNullException">envelope is null.</exception>
        public static string Serialize(TunnelEnvelope envelope)
        {
            ArgumentNullException.ThrowIfNull(envelope);
            return JsonSerializer.Serialize(envelope, TunnelJsonContext.Default.TunnelEnvelope);
        }

        /// <summary>
        /// Serialize a sign-out request body (source-generated, AOT safe).
        /// </summary>
        /// <param name="request">Request.</param>
        /// <returns>JSON.</returns>
        public static string SerializeSignOut(MachineSignOutRequest request)
        {
            ArgumentNullException.ThrowIfNull(request);
            return JsonSerializer.Serialize(request, TunnelJsonContext.Default.MachineSignOutRequest);
        }

        /// <summary>
        /// Parse a JSON text frame.
        /// </summary>
        /// <param name="json">JSON text.</param>
        /// <returns>Envelope.</returns>
        /// <exception cref="TunnelProtocolException">The text is empty, is not JSON, or has no type.</exception>
        public static TunnelEnvelope Deserialize(string json)
        {
            if (String.IsNullOrWhiteSpace(json)) throw new TunnelProtocolException("Tunnel frame is empty.");
            TunnelEnvelope? envelope;
            try
            {
                envelope = JsonSerializer.Deserialize(json, TunnelJsonContext.Default.TunnelEnvelope);
            }
            catch (JsonException e)
            {
                throw new TunnelProtocolException("Tunnel frame is not valid JSON: " + e.Message, e);
            }

            if (envelope == null || String.IsNullOrWhiteSpace(envelope.Type)) throw new TunnelProtocolException("Tunnel frame has no type.");
            return envelope;
        }

        /// <summary>
        /// Build the tunnel WebSocket URI from a server URL. <c>http</c> becomes <c>ws</c>, <c>https</c> becomes <c>wss</c>,
        /// and <see cref="TunnelPath"/> replaces an empty path.
        /// </summary>
        /// <param name="serverUrl">Server URL, for example <c>https://app.usemux.ai</c>. Blank uses <see cref="DefaultServerUrl"/>.</param>
        /// <returns>Tunnel URI.</returns>
        /// <exception cref="ArgumentException">The URL is not absolute or uses an unsupported scheme.</exception>
        public static Uri ToTunnelUri(string? serverUrl)
        {
            string value = String.IsNullOrWhiteSpace(serverUrl) ? DefaultServerUrl : serverUrl.Trim();
            if (!Uri.TryCreate(value, UriKind.Absolute, out Uri? uri)) throw new ArgumentException("Mux Cloud server URL '" + value + "' is not an absolute URL.", nameof(serverUrl));
            string scheme;
            switch (uri.Scheme.ToLowerInvariant())
            {
                case "https":
                case "wss":
                    scheme = "wss";
                    break;
                case "http":
                case "ws":
                    scheme = "ws";
                    break;
                default:
                    throw new ArgumentException("Mux Cloud server URL '" + value + "' uses unsupported scheme '" + uri.Scheme + "'. Use https or http.", nameof(serverUrl));
            }

            UriBuilder builder = new UriBuilder(uri) { Scheme = scheme, Port = uri.IsDefaultPort ? -1 : uri.Port };
            string path = builder.Path.TrimEnd('/');
            builder.Path = path.Length == 0 ? TunnelPath : path;
            return builder.Uri;
        }

        /// <summary>
        /// Build an absolute HTTP(S) URL on the server for a path, for example the enrollment route.
        /// </summary>
        /// <param name="serverUrl">Server URL. Blank uses <see cref="DefaultServerUrl"/>.</param>
        /// <param name="path">Absolute path starting with a slash.</param>
        /// <returns>URI.</returns>
        /// <exception cref="ArgumentException">The URL is not absolute or uses an unsupported scheme.</exception>
        public static Uri ToHttpUri(string? serverUrl, string path)
        {
            string value = String.IsNullOrWhiteSpace(serverUrl) ? DefaultServerUrl : serverUrl.Trim();
            if (!Uri.TryCreate(value, UriKind.Absolute, out Uri? uri)) throw new ArgumentException("Mux Cloud server URL '" + value + "' is not an absolute URL.", nameof(serverUrl));
            string scheme;
            switch (uri.Scheme.ToLowerInvariant())
            {
                case "https":
                case "wss":
                    scheme = "https";
                    break;
                case "http":
                case "ws":
                    scheme = "http";
                    break;
                default:
                    throw new ArgumentException("Mux Cloud server URL '" + value + "' uses unsupported scheme '" + uri.Scheme + "'. Use https or http.", nameof(serverUrl));
            }

            UriBuilder builder = new UriBuilder(uri) { Scheme = scheme, Port = uri.IsDefaultPort ? -1 : uri.Port, Path = path, Query = String.Empty };
            return builder.Uri;
        }

        /// <summary>
        /// Build a <see cref="TunnelMessageTypes.Hello"/> envelope.
        /// </summary>
        /// <param name="hello">Payload.</param>
        /// <returns>Envelope.</returns>
        /// <exception cref="ArgumentNullException">hello is null.</exception>
        public static TunnelEnvelope CreateHello(TunnelHelloPayload hello)
        {
            ArgumentNullException.ThrowIfNull(hello);
            return new TunnelEnvelope { Type = TunnelMessageTypes.Hello, Hello = hello };
        }

        /// <summary>
        /// Build a <see cref="TunnelMessageTypes.Welcome"/> envelope.
        /// </summary>
        /// <param name="welcome">Payload.</param>
        /// <returns>Envelope.</returns>
        /// <exception cref="ArgumentNullException">welcome is null.</exception>
        public static TunnelEnvelope CreateWelcome(TunnelWelcomePayload welcome)
        {
            ArgumentNullException.ThrowIfNull(welcome);
            return new TunnelEnvelope { Type = TunnelMessageTypes.Welcome, Welcome = welcome };
        }

        /// <summary>
        /// Build a <see cref="TunnelMessageTypes.Ping"/> envelope with a fresh nonce.
        /// </summary>
        /// <returns>Envelope.</returns>
        public static TunnelEnvelope CreatePing()
        {
            return new TunnelEnvelope { Type = TunnelMessageTypes.Ping, Ping = new TunnelPingPayload { Nonce = TunnelProof.CreateNonce() } };
        }

        /// <summary>
        /// Build a <see cref="TunnelMessageTypes.Pong"/> envelope echoing a ping.
        /// </summary>
        /// <param name="ping">The ping being answered; null echoes an empty nonce.</param>
        /// <returns>Envelope.</returns>
        public static TunnelEnvelope CreatePong(TunnelEnvelope? ping)
        {
            string nonce = ping?.Ping?.Nonce ?? String.Empty;
            return new TunnelEnvelope { Type = TunnelMessageTypes.Pong, Ping = new TunnelPingPayload { Nonce = nonce } };
        }

        /// <summary>
        /// Build a <see cref="TunnelMessageTypes.GoAway"/> envelope.
        /// </summary>
        /// <param name="reason">Reason.</param>
        /// <param name="retryAfterSeconds">Seconds before reconnecting.</param>
        /// <returns>Envelope.</returns>
        public static TunnelEnvelope CreateGoAway(string reason, int retryAfterSeconds)
        {
            return new TunnelEnvelope { Type = TunnelMessageTypes.GoAway, GoAway = new TunnelGoAwayPayload { Reason = reason, RetryAfterSeconds = retryAfterSeconds } };
        }

        /// <summary>
        /// Build a <see cref="TunnelMessageTypes.HttpRequest"/> envelope.
        /// </summary>
        /// <param name="streamId">Stream identifier.</param>
        /// <param name="request">Payload.</param>
        /// <returns>Envelope.</returns>
        /// <exception cref="ArgumentException">streamId is blank.</exception>
        /// <exception cref="ArgumentNullException">request is null.</exception>
        public static TunnelEnvelope CreateHttpRequest(string streamId, HttpRequestPayload request)
        {
            RequireId(streamId, nameof(streamId));
            ArgumentNullException.ThrowIfNull(request);
            return new TunnelEnvelope { Type = TunnelMessageTypes.HttpRequest, Id = streamId, HttpRequest = request };
        }

        /// <summary>
        /// Build a <see cref="TunnelMessageTypes.HttpResponseStart"/> envelope.
        /// </summary>
        /// <param name="streamId">Stream identifier.</param>
        /// <param name="start">Payload.</param>
        /// <returns>Envelope.</returns>
        /// <exception cref="ArgumentException">streamId is blank.</exception>
        /// <exception cref="ArgumentNullException">start is null.</exception>
        public static TunnelEnvelope CreateHttpResponseStart(string streamId, HttpResponseStartPayload start)
        {
            RequireId(streamId, nameof(streamId));
            ArgumentNullException.ThrowIfNull(start);
            return new TunnelEnvelope { Type = TunnelMessageTypes.HttpResponseStart, Id = streamId, HttpResponseStart = start };
        }

        /// <summary>
        /// Build a <see cref="TunnelMessageTypes.HttpResponseChunk"/> envelope.
        /// </summary>
        /// <param name="streamId">Stream identifier.</param>
        /// <param name="data">Raw bytes.</param>
        /// <param name="offset">Offset into data.</param>
        /// <param name="count">Number of bytes.</param>
        /// <returns>Envelope.</returns>
        /// <exception cref="ArgumentException">streamId is blank.</exception>
        /// <exception cref="ArgumentNullException">data is null.</exception>
        public static TunnelEnvelope CreateHttpChunk(string streamId, byte[] data, int offset, int count)
        {
            RequireId(streamId, nameof(streamId));
            ArgumentNullException.ThrowIfNull(data);
            return new TunnelEnvelope { Type = TunnelMessageTypes.HttpResponseChunk, Id = streamId, HttpChunk = new HttpChunkPayload { Data = Convert.ToBase64String(data, offset, count) } };
        }

        /// <summary>
        /// Build a <see cref="TunnelMessageTypes.HttpResponseEnd"/> envelope.
        /// </summary>
        /// <param name="streamId">Stream identifier.</param>
        /// <returns>Envelope.</returns>
        /// <exception cref="ArgumentException">streamId is blank.</exception>
        public static TunnelEnvelope CreateHttpResponseEnd(string streamId)
        {
            RequireId(streamId, nameof(streamId));
            return new TunnelEnvelope { Type = TunnelMessageTypes.HttpResponseEnd, Id = streamId };
        }

        /// <summary>
        /// Build a <see cref="TunnelMessageTypes.HttpCancel"/> envelope.
        /// </summary>
        /// <param name="streamId">Stream identifier.</param>
        /// <returns>Envelope.</returns>
        /// <exception cref="ArgumentException">streamId is blank.</exception>
        public static TunnelEnvelope CreateHttpCancel(string streamId)
        {
            RequireId(streamId, nameof(streamId));
            return new TunnelEnvelope { Type = TunnelMessageTypes.HttpCancel, Id = streamId };
        }

        /// <summary>
        /// Build a <see cref="TunnelMessageTypes.WsOpen"/> envelope.
        /// </summary>
        /// <param name="channelId">Channel identifier.</param>
        /// <param name="open">Payload.</param>
        /// <returns>Envelope.</returns>
        /// <exception cref="ArgumentException">channelId is blank.</exception>
        /// <exception cref="ArgumentNullException">open is null.</exception>
        public static TunnelEnvelope CreateWsOpen(string channelId, WsOpenPayload open)
        {
            RequireId(channelId, nameof(channelId));
            ArgumentNullException.ThrowIfNull(open);
            return new TunnelEnvelope { Type = TunnelMessageTypes.WsOpen, Id = channelId, WsOpen = open };
        }

        /// <summary>
        /// Build a <see cref="TunnelMessageTypes.WsOpened"/> envelope.
        /// </summary>
        /// <param name="channelId">Channel identifier.</param>
        /// <returns>Envelope.</returns>
        /// <exception cref="ArgumentException">channelId is blank.</exception>
        public static TunnelEnvelope CreateWsOpened(string channelId)
        {
            RequireId(channelId, nameof(channelId));
            return new TunnelEnvelope { Type = TunnelMessageTypes.WsOpened, Id = channelId };
        }

        /// <summary>
        /// Build a <see cref="TunnelMessageTypes.WsFrame"/> envelope.
        /// </summary>
        /// <param name="channelId">Channel identifier.</param>
        /// <param name="text">Message text.</param>
        /// <returns>Envelope.</returns>
        /// <exception cref="ArgumentException">channelId is blank.</exception>
        public static TunnelEnvelope CreateWsFrame(string channelId, string text)
        {
            RequireId(channelId, nameof(channelId));
            return new TunnelEnvelope { Type = TunnelMessageTypes.WsFrame, Id = channelId, WsFrame = new WsFramePayload { Text = text } };
        }

        /// <summary>
        /// Build a <see cref="TunnelMessageTypes.WsClose"/> envelope.
        /// </summary>
        /// <param name="channelId">Channel identifier.</param>
        /// <param name="code">Close code.</param>
        /// <param name="reason">Reason.</param>
        /// <returns>Envelope.</returns>
        /// <exception cref="ArgumentException">channelId is blank.</exception>
        public static TunnelEnvelope CreateWsClose(string channelId, int code, string reason)
        {
            RequireId(channelId, nameof(channelId));
            return new TunnelEnvelope { Type = TunnelMessageTypes.WsClose, Id = channelId, WsClose = new WsClosePayload { Code = code, Reason = reason } };
        }

        /// <summary>
        /// Build a <see cref="TunnelMessageTypes.StreamError"/> envelope.
        /// </summary>
        /// <param name="id">Stream or channel identifier.</param>
        /// <param name="code">Error code (see <see cref="TunnelErrorCodes"/>).</param>
        /// <param name="message">Message with context.</param>
        /// <param name="statusCode">HTTP status for the client when no response has started.</param>
        /// <returns>Envelope.</returns>
        /// <exception cref="ArgumentException">id is blank.</exception>
        public static TunnelEnvelope CreateStreamError(string id, string code, string message, int statusCode)
        {
            RequireId(id, nameof(id));
            return new TunnelEnvelope { Type = TunnelMessageTypes.StreamError, Id = id, Error = new TunnelErrorPayload { Code = code, Message = message, StatusCode = statusCode } };
        }

        /// <summary>
        /// Build a <see cref="TunnelMessageTypes.MachineStatus"/> envelope.
        /// </summary>
        /// <param name="status">Payload.</param>
        /// <returns>Envelope.</returns>
        /// <exception cref="ArgumentNullException">status is null.</exception>
        public static TunnelEnvelope CreateMachineStatus(MachineStatusPayload status)
        {
            ArgumentNullException.ThrowIfNull(status);
            return new TunnelEnvelope { Type = TunnelMessageTypes.MachineStatus, MachineStatus = status };
        }

        /// <summary>
        /// Capabilities both sides support, in this package's order.
        /// </summary>
        /// <param name="local">One side's capabilities.</param>
        /// <param name="remote">The other side's capabilities.</param>
        /// <returns>Intersection.</returns>
        public static List<string> IntersectCapabilities(IEnumerable<string>? local, IEnumerable<string>? remote)
        {
            HashSet<string> a = new HashSet<string>(local ?? Array.Empty<string>(), StringComparer.Ordinal);
            HashSet<string> b = new HashSet<string>(remote ?? Array.Empty<string>(), StringComparer.Ordinal);
            List<string> result = new List<string>();
            foreach (string capability in TunnelCapabilities.All)
            {
                if (a.Contains(capability) && b.Contains(capability)) result.Add(capability);
            }

            return result;
        }

        #endregion

        #region Private-Methods

        private static void RequireId(string id, string name)
        {
            if (String.IsNullOrWhiteSpace(id)) throw new ArgumentException("A stream or channel identifier is required.", name);
        }

        #endregion
    }
}
