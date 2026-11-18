namespace MuxCloud.Server.Tunnel
{
    using System;
    using System.Collections.Generic;
    using System.Net.WebSockets;
    using System.Threading;
    using System.Threading.Tasks;
    using MuxCloud.Core.Models;
    using MuxCloud.Core.Services;
    using MuxCloud.Protocol;
    using MuxCloud.Server.Http;
    using WatsonWebserver.Core;
    using WatsonWebserver.Core.WebSockets;

    /// <summary>
    /// The machine tunnel endpoint, /v1.0/tunnel. Validates the hello, registers the tunnel (replacing an older one with
    /// 4409), runs a heartbeat in both directions, and dispatches inbound frames without awaiting relay work, so one slow
    /// stream never blocks another or the heartbeat. See WEBSOCKETS_API.md section 1.
    /// Thread safety: one instance serves every connection concurrently.
    /// </summary>
    public class TunnelEndpoint
    {
        #region Private-Members

        private readonly MuxCloudServer _Server;
        private readonly ReplayCache _Replay = new ReplayCache();
        private readonly AttemptLimiter _Failures;

        #endregion

        #region Constructors-and-Factories

        /// <summary>
        /// Instantiate.
        /// </summary>
        /// <param name="server">Server.</param>
        /// <exception cref="ArgumentNullException">server is null.</exception>
        public TunnelEndpoint(MuxCloudServer server)
        {
            ArgumentNullException.ThrowIfNull(server);
            _Server = server;
            _Failures = new AttemptLimiter(server.Settings.Tunnel.MaxHandshakeFailures, TimeSpan.FromSeconds(server.Settings.Tunnel.HandshakeFailureWindowSeconds), TimeSpan.FromSeconds(server.Settings.Tunnel.HandshakeFailureWindowSeconds));
        }

        #endregion

        #region Public-Methods

        /// <summary>
        /// Serve one tunnel connection.
        /// </summary>
        /// <param name="ctx">Upgrade context.</param>
        /// <param name="session">Socket.</param>
        /// <returns>Task.</returns>
        public async Task HandleAsync(HttpContextBase ctx, WebSocketSession session)
        {
            ArgumentNullException.ThrowIfNull(ctx);
            ArgumentNullException.ThrowIfNull(session);
            string ip = RequestContextFactory.SourceIp(ctx, _Server);
            CancellationToken token = ctx.Token;
            if (_Failures.IsLocked("ip:" + ip, out _))
            {
                await CloseAsync(session, TunnelCloseCodes.RateLimited, "too many failed handshakes").ConfigureAwait(false);
                return;
            }

            TunnelEnvelope? hello = await ReadHelloAsync(session, token).ConfigureAwait(false);
            if (hello?.Hello == null)
            {
                _Failures.RecordFailure("ip:" + ip);
                MuxCloudTelemetry.Handshake("bad_handshake");
                await CloseAsync(session, TunnelCloseCodes.BadHandshake, "the first frame must be tunnel.hello").ConfigureAwait(false);
                return;
            }

            TunnelHelloPayload h = hello.Hello;
            if (_Failures.IsLocked("machine:" + h.MachineId, out _))
            {
                await CloseAsync(session, TunnelCloseCodes.RateLimited, "too many failed handshakes").ConfigureAwait(false);
                return;
            }

            if (h.ProtocolVersion < TunnelProtocol.MinimumSupportedVersion)
            {
                MuxCloudTelemetry.Handshake("unsupported_version");
                await CloseAsync(session, TunnelCloseCodes.UnsupportedVersion, "protocol version " + h.ProtocolVersion + " is not supported; upgrade mux").ConfigureAwait(false);
                return;
            }

            if (!TunnelProof.IsTimestampFresh(h.TimestampUtc, DateTime.UtcNow))
            {
                // A skewed clock is recoverable, so it closes with a non-terminal code and mux keeps retrying.
                _Failures.RecordFailure("ip:" + ip);
                MuxCloudTelemetry.Handshake("clock_skew");
                await CloseAsync(session, TunnelCloseCodes.BadHandshake, "timestamp is more than " + TunnelProtocol.HandshakeSkewSeconds + " seconds from server time; check this machine's clock").ConfigureAwait(false);
                return;
            }

            Machine? machine = String.IsNullOrWhiteSpace(h.MachineId) ? null : await _Server.Database.Machines.ReadAsync(h.MachineId, token).ConfigureAwait(false);
            int code = await ValidateAsync(h, machine, token).ConfigureAwait(false);
            if (code != 0)
            {
                _Failures.RecordFailure("ip:" + ip);
                _Failures.RecordFailure("machine:" + h.MachineId);
                MuxCloudTelemetry.Handshake(code == TunnelCloseCodes.Revoked ? "revoked" : "unauthorized");
                await _Server.Audit.WriteAsync("tunnel.handshake", "failure", machine?.TenantId, machine?.UserId, "machine", h.MachineId, ip, "close " + code, token).ConfigureAwait(false);
                await CloseAsync(session, code, code == TunnelCloseCodes.Revoked ? "machine revoked" : "invalid machine credential").ConfigureAwait(false);
                return;
            }

            _Failures.Reset("machine:" + machine!.Id);
            List<string> capabilities = TunnelProtocol.IntersectCapabilities(TunnelCapabilities.All, h.Capabilities);
            int version = Math.Min(TunnelProtocol.CurrentVersion, h.ProtocolVersion);
            DateTime now = DateTime.UtcNow;
            MachineConnection record = new MachineConnection
            {
                TenantId = machine.TenantId,
                MachineId = machine.Id,
                NodeId = _Server.Settings.Server.NodeId,
                RemoteIp = ip,
                ProtocolVersion = version,
                MuxVersion = h.MuxVersion,
                ConnectedUtc = now
            };
            MachineTunnel tunnel = new MachineTunnel(session, machine, record, capabilities, _Server.Settings.Tunnel.MaxConcurrentStreams);
            MachineTunnel? previous = _Server.Registry.Register(tunnel);
            // Close the replaced tunnel in the background: its streams fail at once, and its close handshake must not delay the new welcome.
            if (previous != null) _ = previous.CloseAsync(TunnelCloseCodes.Replaced, "replaced by a newer connection");

            try
            {
                await _Server.Database.MachineConnections.CreateAsync(record, token).ConfigureAwait(false);
                await _Server.Database.Machines.UpdateConnectedAsync(machine.Id, h.MuxVersion, version, h.Hostname, h.Os, now, token).ConfigureAwait(false);
            }
            catch (Exception e) when (!(e is OperationCanceledException))
            {
                _Server.LogError("tunnel bookkeeping failed for " + machine.Id + ": " + e.Message);
            }

            TunnelWelcomePayload welcome = new TunnelWelcomePayload
            {
                ConnectionId = record.Id,
                ProtocolVersion = version,
                ServerVersion = MuxCloud.Core.Constants.Version,
                HeartbeatSeconds = _Server.Settings.Tunnel.HeartbeatSeconds,
                MaxRequestBodyBytes = _Server.Settings.Tunnel.MaxRequestBodyBytes,
                MaxConcurrentStreams = tunnel.MaxConcurrentStreams,
                Capabilities = capabilities,
                MachineName = machine.Name
            };
            if (!await tunnel.SendAsync(TunnelProtocol.CreateWelcome(welcome), token).ConfigureAwait(false))
            {
                await FinishAsync(tunnel, machine, null).ConfigureAwait(false);
                return;
            }

            MuxCloudTelemetry.Handshake("success");
            _Server.Log("tunnel up " + machine.Id + " (" + machine.Name + ") connection " + record.Id + " from " + ip);
            await _Server.PublishMachineAsync(machine.UserId, machine.Id, "machine.online").ConfigureAwait(false);
            using (CancellationTokenSource heartbeat = CancellationTokenSource.CreateLinkedTokenSource(token, tunnel.Lifetime))
            {
                Task beat = Task.Run(() => HeartbeatAsync(tunnel, heartbeat.Token), CancellationToken.None);
                try
                {
                    await ReceiveLoopAsync(tunnel, session, machine, heartbeat.Token).ConfigureAwait(false);
                }
                finally
                {
                    heartbeat.Cancel();
                    try
                    {
                        await beat.ConfigureAwait(false);
                    }
                    catch (Exception)
                    {
                    }

                    await FinishAsync(tunnel, machine, session).ConfigureAwait(false);
                }
            }
        }

        #endregion

        #region Private-Methods

        private async Task<int> ValidateAsync(TunnelHelloPayload h, Machine? machine, CancellationToken token)
        {
            if (machine == null) return TunnelCloseCodes.Unauthorized;
            if (machine.RevokedUtc != null) return TunnelCloseCodes.Revoked;
            User? user = await _Server.Database.Users.ReadAsync(machine.TenantId, machine.UserId, token).ConfigureAwait(false);
            if (user == null || !user.Active) return TunnelCloseCodes.Revoked;
            string? secret = _Server.Machines.GetSecret(machine);
            // A secret that no longer decrypts (for example after Auth.SigningKey changed) is a credential problem, not a revocation.
            if (secret == null) return TunnelCloseCodes.Unauthorized;
            if (!TunnelProof.VerifyProof(secret, machine.Id, h.TimestampUtc, h.Nonce, h.Proof)) return TunnelCloseCodes.Unauthorized;
            if (!_Replay.TryAdd(machine.Id + "|" + h.Nonce)) return TunnelCloseCodes.Unauthorized;
            return 0;
        }

        private async Task<TunnelEnvelope?> ReadHelloAsync(WebSocketSession session, CancellationToken token)
        {
            using (CancellationTokenSource timeout = CancellationTokenSource.CreateLinkedTokenSource(token))
            {
                timeout.CancelAfter(TimeSpan.FromSeconds(_Server.Settings.Tunnel.HandshakeTimeoutSeconds));
                try
                {
                    WebSocketMessage message = await session.ReceiveAsync(timeout.Token).ConfigureAwait(false);
                    if (message == null || message.MessageType != WebSocketMessageType.Text) return null;
                    TunnelEnvelope envelope = TunnelProtocol.Deserialize(message.Text ?? String.Empty);
                    return envelope.Type == TunnelMessageTypes.Hello ? envelope : null;
                }
                catch (Exception)
                {
                    return null;
                }
            }
        }

        private async Task ReceiveLoopAsync(MachineTunnel tunnel, WebSocketSession session, Machine machine, CancellationToken token)
        {
            try
            {
                await foreach (WebSocketMessage message in session.ReadMessagesAsync(token).ConfigureAwait(false))
                {
                    if (message.MessageType == WebSocketMessageType.Close) break;
                    if (message.MessageType != WebSocketMessageType.Text) continue;
                    string text = message.Text ?? String.Empty;
                    tunnel.MarkInbound(text.Length);
                    TunnelEnvelope envelope;
                    try
                    {
                        envelope = TunnelProtocol.Deserialize(text);
                    }
                    catch (TunnelProtocolException)
                    {
                        continue;
                    }

                    Dispatch(tunnel, machine, envelope);
                }
            }
            catch (OperationCanceledException)
            {
            }
            catch (Exception e)
            {
                _Server.Log("tunnel receive ended for " + machine.Id + ": " + e.Message);
            }
        }

        private void Dispatch(MachineTunnel tunnel, Machine machine, TunnelEnvelope envelope)
        {
            switch (envelope.Type)
            {
                case TunnelMessageTypes.Ping:
                    _ = tunnel.SendAsync(TunnelProtocol.CreatePong(envelope));
                    break;
                case TunnelMessageTypes.Pong:
                    break;
                case TunnelMessageTypes.HttpResponseStart:
                case TunnelMessageTypes.HttpResponseChunk:
                case TunnelMessageTypes.HttpResponseEnd:
                    tunnel.FindStream(envelope.Id)?.Write(envelope);
                    break;
                case TunnelMessageTypes.StreamError:
                    RelayStream? stream = tunnel.FindStream(envelope.Id);
                    if (stream != null) stream.Write(envelope);
                    else tunnel.FindChannel(envelope.Id)?.Close(1011, envelope.Error?.Message ?? "machine error");
                    break;
                case TunnelMessageTypes.WsOpened:
                    tunnel.FindChannel(envelope.Id)?.MarkOpened();
                    break;
                case TunnelMessageTypes.WsFrame:
                    if (envelope.WsFrame != null) tunnel.FindChannel(envelope.Id)?.Enqueue(envelope.WsFrame.Text);
                    break;
                case TunnelMessageTypes.WsClose:
                    RelayChannel? channel = tunnel.FindChannel(envelope.Id);
                    if (channel != null)
                    {
                        tunnel.RemoveChannel(channel.Id);
                        channel.Close(envelope.WsClose?.Code ?? 1000, envelope.WsClose?.Reason ?? String.Empty);
                    }

                    break;
                case TunnelMessageTypes.MachineStatus:
                    if (envelope.MachineStatus != null) _ = Task.Run(() => _Server.HandleMachineStatusAsync(machine, envelope.MachineStatus));
                    break;
                default:
                    break;
            }
        }

        private async Task HeartbeatAsync(MachineTunnel tunnel, CancellationToken token)
        {
            TimeSpan interval = TimeSpan.FromSeconds(_Server.Settings.Tunnel.HeartbeatSeconds);
            try
            {
                using (PeriodicTimer timer = new PeriodicTimer(interval))
                {
                    while (await timer.WaitForNextTickAsync(token).ConfigureAwait(false))
                    {
                        if (tunnel.MissedHeartbeats >= _Server.Settings.Tunnel.MissedHeartbeats)
                        {
                            _Server.Log("tunnel heartbeat timeout for " + tunnel.MachineId);
                            await tunnel.CloseAsync(TunnelCloseCodes.HeartbeatTimeout, "heartbeat timeout").ConfigureAwait(false);
                            return;
                        }

                        tunnel.CountPing();
                        await tunnel.SendAsync(TunnelProtocol.CreatePing(), token).ConfigureAwait(false);
                    }
                }
            }
            catch (OperationCanceledException)
            {
            }
        }

        private async Task FinishAsync(MachineTunnel tunnel, Machine machine, WebSocketSession? session)
        {
            tunnel.MarkClosed();
            bool offline = _Server.Registry.Unregister(tunnel);
            DateTime now = DateTime.UtcNow;
            tunnel.Connection.DisconnectedUtc = now;
            tunnel.Connection.CloseCode = tunnel.ServerCloseCode ?? (session?.CloseStatus.HasValue == true ? (int)session.CloseStatus!.Value : 1006);
            tunnel.Connection.CloseReason = Truncate(session?.CloseStatusDescription ?? String.Empty, 200);
            tunnel.Connection.BytesIn = tunnel.BytesIn;
            tunnel.Connection.BytesOut = tunnel.BytesOut;
            try
            {
                await _Server.Database.MachineConnections.UpdateAsync(tunnel.Connection, CancellationToken.None).ConfigureAwait(false);
                if (offline) await _Server.Database.Machines.UpdateDisconnectedAsync(machine.Id, now, CancellationToken.None).ConfigureAwait(false);
            }
            catch (Exception e)
            {
                _Server.LogError("tunnel close bookkeeping failed for " + machine.Id + ": " + e.Message);
            }

            _Server.Log("tunnel down " + machine.Id + " connection " + tunnel.Connection.Id + " code " + tunnel.Connection.CloseCode + (offline ? String.Empty : " (replaced)"));
            if (offline) await _Server.PublishMachineAsync(machine.UserId, machine.Id, "machine.offline").ConfigureAwait(false);
        }

        private static async Task CloseAsync(WebSocketSession session, int code, string reason)
        {
            try
            {
                await session.CloseAsync((WebSocketCloseStatus)code, reason, CancellationToken.None).ConfigureAwait(false);
            }
            catch (Exception)
            {
            }
        }

        private static string Truncate(string value, int max)
        {
            return value.Length <= max ? value : value.Substring(0, max);
        }

        #endregion
    }
}
