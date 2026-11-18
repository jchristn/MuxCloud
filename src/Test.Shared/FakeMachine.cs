namespace Test.Shared
{
    using System;
    using System.Collections.Concurrent;
    using System.Collections.Generic;
    using System.Net.WebSockets;
    using System.Text;
    using System.Threading;
    using System.Threading.Tasks;
    using MuxCloud.Protocol;

    /// <summary>
    /// A scripted machine that speaks the tunnel protocol with MuxCloud.Protocol, for end-to-end relay tests.
    /// </summary>
    public sealed class FakeMachine : IAsyncDisposable
    {
        #region Public-Members

        /// <summary>
        /// Machine identifier.
        /// </summary>
        public string MachineId { get; }

        /// <summary>
        /// Machine secret.
        /// </summary>
        public string Secret { get; set; }

        /// <summary>
        /// Answer relayed requests; the default echoes the path as JSON.
        /// </summary>
        public Func<HttpRequestPayload, FakeResponse> Respond { get; set; }

        /// <summary>
        /// Whether to answer pings.
        /// </summary>
        public bool AnswerPings { get; set; } = true;

        /// <summary>
        /// Whether to accept ws.open.
        /// </summary>
        public bool AcceptChannels { get; set; } = true;

        /// <summary>
        /// Requests received.
        /// </summary>
        public ConcurrentQueue<HttpRequestPayload> Requests { get; } = new ConcurrentQueue<HttpRequestPayload>();

        /// <summary>
        /// Stream identifiers that were cancelled.
        /// </summary>
        public ConcurrentQueue<string> Cancelled { get; } = new ConcurrentQueue<string>();

        /// <summary>
        /// Channel frames received, as "channelId|text".
        /// </summary>
        public ConcurrentQueue<string> ChannelFrames { get; } = new ConcurrentQueue<string>();

        /// <summary>
        /// Channels opened by the cloud.
        /// </summary>
        public ConcurrentQueue<string> OpenedChannels { get; } = new ConcurrentQueue<string>();

        /// <summary>
        /// The welcome, once received.
        /// </summary>
        public TunnelWelcomePayload? Welcome { get; private set; } = null;

        /// <summary>
        /// Close code the server sent, once closed.
        /// </summary>
        public int? CloseCode { get; private set; } = null;

        /// <summary>
        /// Completes when the socket closes.
        /// </summary>
        public Task Closed
        {
            get { return _Closed.Task; }
        }

        #endregion

        #region Private-Members

        private readonly string _BaseUrl;
        private readonly ClientWebSocket _Socket = new ClientWebSocket();
        private readonly SemaphoreSlim _SendLock = new SemaphoreSlim(1, 1);
        private readonly CancellationTokenSource _Lifetime = new CancellationTokenSource();
        private readonly TaskCompletionSource _Closed = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        private readonly ConcurrentDictionary<string, CancellationTokenSource> _Streams = new ConcurrentDictionary<string, CancellationTokenSource>();

        #endregion

        #region Constructors-and-Factories

        /// <summary>
        /// Instantiate.
        /// </summary>
        /// <param name="baseUrl">Cloud base URL.</param>
        /// <param name="machineId">Machine identifier.</param>
        /// <param name="secret">Machine secret.</param>
        public FakeMachine(string baseUrl, string machineId, string secret)
        {
            _BaseUrl = baseUrl;
            MachineId = machineId;
            Secret = secret;
            Respond = (HttpRequestPayload r) => new FakeResponse { Chunks = new List<string> { "{\"path\":\"" + r.Path + "\",\"method\":\"" + r.Method + "\"}" } };
        }

        #endregion

        #region Public-Methods

        /// <summary>
        /// Connect and send the hello. Does not wait for the welcome.
        /// </summary>
        /// <param name="token">Cancellation token.</param>
        /// <param name="mutate">Optional change to the hello before sending.</param>
        /// <param name="firstFrame">Optional raw first frame instead of a hello.</param>
        /// <returns>Task.</returns>
        public async Task ConnectAsync(CancellationToken token, Action<TunnelHelloPayload>? mutate = null, string? firstFrame = null)
        {
            await _Socket.ConnectAsync(TunnelProtocol.ToTunnelUri(_BaseUrl), token).ConfigureAwait(false);
            string ts = TunnelProof.FormatTimestamp(DateTime.UtcNow);
            string nonce = TunnelProof.CreateNonce();
            TunnelHelloPayload hello = new TunnelHelloPayload
            {
                MachineId = MachineId,
                MuxVersion = "2.0.0-test",
                MachineName = "fake",
                Hostname = "fake.local",
                Os = "TestOS",
                Capabilities = new List<string>(TunnelCapabilities.All),
                TimestampUtc = ts,
                Nonce = nonce,
                Proof = TunnelProof.ComputeProof(Secret, MachineId, ts, nonce)
            };
            mutate?.Invoke(hello);
            await SendRawAsync(firstFrame ?? TunnelProtocol.Serialize(TunnelProtocol.CreateHello(hello))).ConfigureAwait(false);
            _ = Task.Run(() => ReceiveLoopAsync(), CancellationToken.None);
        }

        /// <summary>
        /// Wait for the welcome or a close.
        /// </summary>
        /// <param name="timeout">Timeout.</param>
        /// <returns>True when welcomed.</returns>
        public async Task<bool> WaitWelcomeAsync(TimeSpan timeout)
        {
            DateTime until = DateTime.UtcNow + timeout;
            while (DateTime.UtcNow < until)
            {
                if (Welcome != null) return true;
                if (_Closed.Task.IsCompleted) return false;
                await Task.Delay(20).ConfigureAwait(false);
            }

            return Welcome != null;
        }

        /// <summary>
        /// Wait for the close.
        /// </summary>
        /// <param name="timeout">Timeout.</param>
        /// <returns>Close code, or null on timeout.</returns>
        public async Task<int?> WaitClosedAsync(TimeSpan timeout)
        {
            await Task.WhenAny(_Closed.Task, Task.Delay(timeout)).ConfigureAwait(false);
            return CloseCode;
        }

        /// <summary>
        /// Send a frame on a relayed channel.
        /// </summary>
        /// <param name="channelId">Channel.</param>
        /// <param name="text">Text.</param>
        /// <returns>Task.</returns>
        public Task PushAsync(string channelId, string text)
        {
            return SendAsync(TunnelProtocol.CreateWsFrame(channelId, text));
        }

        /// <summary>
        /// Send a status push.
        /// </summary>
        /// <param name="status">Status.</param>
        /// <returns>Task.</returns>
        public Task SendStatusAsync(MachineStatusPayload status)
        {
            return SendAsync(TunnelProtocol.CreateMachineStatus(status));
        }

        /// <summary>
        /// Close the socket.
        /// </summary>
        /// <returns>Task.</returns>
        public async ValueTask DisposeAsync()
        {
            _Lifetime.Cancel();
            try
            {
                if (_Socket.State == WebSocketState.Open) await _Socket.CloseAsync(WebSocketCloseStatus.NormalClosure, "bye", CancellationToken.None).ConfigureAwait(false);
            }
            catch (Exception)
            {
            }

            _Socket.Dispose();
        }

        #endregion

        #region Private-Methods

        private async Task AcknowledgeCloseAsync()
        {
            try
            {
                if (_Socket.State == WebSocketState.CloseReceived) await _Socket.CloseOutputAsync(WebSocketCloseStatus.NormalClosure, "ack", CancellationToken.None).ConfigureAwait(false);
            }
            catch (Exception)
            {
            }
        }

        private async Task ReceiveLoopAsync()
        {
            byte[] buffer = new byte[64 * 1024];
            try
            {
                while (_Socket.State == WebSocketState.Open)
                {
                    StringBuilder text = new StringBuilder();
                    WebSocketReceiveResult result;
                    do
                    {
                        result = await _Socket.ReceiveAsync(new ArraySegment<byte>(buffer), _Lifetime.Token).ConfigureAwait(false);
                        if (result.MessageType == WebSocketMessageType.Close) break;
                        text.Append(Encoding.UTF8.GetString(buffer, 0, result.Count));
                    }
                    while (!result.EndOfMessage);
                    if (result.MessageType == WebSocketMessageType.Close)
                    {
                        await AcknowledgeCloseAsync().ConfigureAwait(false);
                        break;
                    }

                    Handle(TunnelProtocol.Deserialize(text.ToString()));
                }
            }
            catch (Exception)
            {
            }

            CloseCode = _Socket.CloseStatus.HasValue ? (int)_Socket.CloseStatus.Value : 1006;
            _Closed.TrySetResult();
        }

        private void Handle(TunnelEnvelope e)
        {
            switch (e.Type)
            {
                case TunnelMessageTypes.Welcome:
                    Welcome = e.Welcome;
                    break;
                case TunnelMessageTypes.Ping:
                    if (AnswerPings) _ = SendAsync(TunnelProtocol.CreatePong(e));
                    break;
                case TunnelMessageTypes.HttpRequest:
                    Requests.Enqueue(e.HttpRequest!);
                    CancellationTokenSource cts = new CancellationTokenSource();
                    _Streams[e.Id!] = cts;
                    _ = Task.Run(() => AnswerAsync(e.Id!, e.HttpRequest!, cts.Token));
                    break;
                case TunnelMessageTypes.HttpCancel:
                    Cancelled.Enqueue(e.Id!);
                    if (_Streams.TryRemove(e.Id!, out CancellationTokenSource? c)) c.Cancel();
                    break;
                case TunnelMessageTypes.WsOpen:
                    OpenedChannels.Enqueue(e.Id!);
                    _ = AcceptChannels ? SendAsync(TunnelProtocol.CreateWsOpened(e.Id!)) : SendAsync(TunnelProtocol.CreateStreamError(e.Id!, TunnelErrorCodes.LoopbackFailed, "refused", 502));
                    break;
                case TunnelMessageTypes.WsFrame:
                    ChannelFrames.Enqueue(e.Id + "|" + e.WsFrame!.Text);
                    _ = SendAsync(TunnelProtocol.CreateWsFrame(e.Id!, "echo:" + e.WsFrame.Text));
                    break;
            }
        }

        private async Task AnswerAsync(string streamId, HttpRequestPayload request, CancellationToken token)
        {
            FakeResponse response = Respond(request);
            if (response.NeverRespond) return;
            if (response.ErrorCode != null)
            {
                await SendAsync(TunnelProtocol.CreateStreamError(streamId, response.ErrorCode, "fake error", 502)).ConfigureAwait(false);
                return;
            }

            await SendAsync(TunnelProtocol.CreateHttpResponseStart(streamId, new HttpResponseStartPayload { StatusCode = response.StatusCode, ContentType = response.ContentType, Headers = response.Headers })).ConfigureAwait(false);
            try
            {
                foreach (string chunk in response.Chunks)
                {
                    if (response.ChunkDelayMs > 0) await Task.Delay(response.ChunkDelayMs, token).ConfigureAwait(false);
                    byte[] bytes = Encoding.UTF8.GetBytes(chunk);
                    await SendAsync(TunnelProtocol.CreateHttpChunk(streamId, bytes, 0, bytes.Length)).ConfigureAwait(false);
                }

                await SendAsync(TunnelProtocol.CreateHttpResponseEnd(streamId)).ConfigureAwait(false);
            }
            catch (OperationCanceledException)
            {
            }
            finally
            {
                _Streams.TryRemove(streamId, out _);
            }
        }

        private Task SendAsync(TunnelEnvelope envelope)
        {
            return SendRawAsync(TunnelProtocol.Serialize(envelope));
        }

        private async Task SendRawAsync(string json)
        {
            await _SendLock.WaitAsync().ConfigureAwait(false);
            try
            {
                if (_Socket.State == WebSocketState.Open) await _Socket.SendAsync(Encoding.UTF8.GetBytes(json), WebSocketMessageType.Text, true, CancellationToken.None).ConfigureAwait(false);
            }
            catch (Exception)
            {
            }
            finally
            {
                _SendLock.Release();
            }
        }

        #endregion
    }
}
