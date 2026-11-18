namespace MuxCloud.Server.Relay
{
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Net.WebSockets;
    using System.Threading;
    using System.Threading.Tasks;
    using MuxCloud.Core;
    using MuxCloud.Core.Exceptions;
    using MuxCloud.Core.Models;
    using MuxCloud.Core.Services;
    using MuxCloud.Protocol;
    using MuxCloud.Server.Http;
    using MuxCloud.Server.Tunnel;
    using WatsonWebserver.Core;
    using WatsonWebserver.Core.WebSockets;

    /// <summary>
    /// Relays /m/{machineId}/v1.0/ws: opens a ws.* channel on the machine's tunnel and passes frames both ways untouched.
    /// Thread safety: one instance serves every connection concurrently.
    /// </summary>
    public class RelayWebSocketHandler
    {
        #region Public-Members

        /// <summary>
        /// Route template.
        /// </summary>
        public const string Path = "/m/{machineId}/v1.0/ws";

        #endregion

        #region Private-Members

        private readonly MuxCloudServer _Server;

        #endregion

        #region Constructors-and-Factories

        /// <summary>
        /// Instantiate.
        /// </summary>
        /// <param name="server">Server.</param>
        /// <exception cref="ArgumentNullException">server is null.</exception>
        public RelayWebSocketHandler(MuxCloudServer server)
        {
            ArgumentNullException.ThrowIfNull(server);
            _Server = server;
        }

        #endregion

        #region Public-Methods

        /// <summary>
        /// Serve one relayed socket.
        /// </summary>
        /// <param name="ctx">Upgrade context.</param>
        /// <param name="session">Client socket.</param>
        /// <returns>Task.</returns>
        public async Task HandleAsync(HttpContextBase ctx, WebSocketSession session)
        {
            ArgumentNullException.ThrowIfNull(ctx);
            ArgumentNullException.ThrowIfNull(session);
            RequestContext? rc = await WebSocketAuth.AuthenticateAsync(ctx, _Server).ConfigureAwait(false);
            if (rc?.Principal == null)
            {
                await CloseAsync(session, 4401, "authentication required").ConfigureAwait(false);
                return;
            }

            if (!RelayHandler.TryParse(ctx.Request.Url.RawWithoutQuery, out string machineId, out string localPath))
            {
                await CloseAsync(session, 4404, "not found").ConfigureAwait(false);
                return;
            }

            Machine machine;
            try
            {
                machine = await _Server.Machines.ReadForUserAsync(rc.Principal.User, machineId, ctx.Token).ConfigureAwait(false);
                string feature = rc.AuthScheme == AuthSchemeEnum.Cookie ? Constants.FeatureWebAccess : Constants.FeatureMobileAccess;
                await _Server.Entitlements.RequireAsync(rc.Principal.User.AccountId, feature, ctx.Token).ConfigureAwait(false);
            }
            catch (ApiException e)
            {
                await CloseAsync(session, e.StatusCode == 404 ? 4404 : 4402, e.Message).ConfigureAwait(false);
                return;
            }

            MachineTunnel? tunnel = _Server.Registry.Get(machine.Id);
            if (tunnel == null)
            {
                await CloseAsync(session, 4503, "machine offline").ConfigureAwait(false);
                return;
            }

            using (CancellationTokenSource lifetime = CancellationTokenSource.CreateLinkedTokenSource(ctx.Token, tunnel.Lifetime))
            {
                RelayChannel channel = new RelayChannel(session, lifetime.Token);
                if (!tunnel.TryOpenChannel(channel))
                {
                    channel.Close(4503, "too many streams");
                    await channel.Closed.ConfigureAwait(false);
                    return;
                }

                try
                {
                    WsOpenPayload open = new WsOpenPayload
                    {
                        Path = localPath,
                        Query = QueryWithoutTicket(ctx),
                        Subprotocols = session.Request?.RequestedSubprotocols?.ToList() ?? new List<string>(),
                        RequesterIp = rc.SourceIp
                    };
                    if (!await tunnel.SendAsync(TunnelProtocol.CreateWsOpen(channel.Id, open), lifetime.Token).ConfigureAwait(false))
                    {
                        channel.Close(1011, "machine unavailable");
                        return;
                    }

                    Task<bool> opened = channel.Opened;
                    Task winner = await Task.WhenAny(opened, Task.Delay(TimeSpan.FromSeconds(_Server.Settings.Tunnel.FirstByteTimeoutSeconds), lifetime.Token)).ConfigureAwait(false);
                    if (winner != opened || !opened.Result)
                    {
                        channel.Close(1011, "the machine could not open its socket");
                        return;
                    }

                    await foreach (WebSocketMessage message in session.ReadMessagesAsync(lifetime.Token).ConfigureAwait(false))
                    {
                        if (message.MessageType == WebSocketMessageType.Close) break;
                        if (message.MessageType != WebSocketMessageType.Text) continue;
                        if (!await tunnel.SendAsync(TunnelProtocol.CreateWsFrame(channel.Id, message.Text ?? String.Empty), lifetime.Token).ConfigureAwait(false)) break;
                    }

                    await tunnel.SendAsync(TunnelProtocol.CreateWsClose(channel.Id, 1000, "client closed"), CancellationToken.None).ConfigureAwait(false);
                }
                catch (OperationCanceledException)
                {
                }
                catch (Exception e)
                {
                    _Server.Log("relayed socket ended for " + machine.Id + ": " + e.Message);
                }
                finally
                {
                    tunnel.RemoveChannel(channel.Id);
                    channel.Close(1000, String.Empty);
                    await Task.WhenAny(channel.Closed, Task.Delay(2000)).ConfigureAwait(false);
                }
            }
        }

        #endregion

        #region Private-Methods

        private static string QueryWithoutTicket(HttpContextBase ctx)
        {
            string raw = ctx.Request.Url.RawWithQuery ?? String.Empty;
            int q = raw.IndexOf('?', StringComparison.Ordinal);
            if (q < 0) return String.Empty;
            IEnumerable<string> parts = raw.Substring(q + 1).Split('&').Where(p => p.Length > 0 && !p.StartsWith("ticket=", StringComparison.OrdinalIgnoreCase));
            return String.Join("&", parts);
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

        #endregion
    }
}
