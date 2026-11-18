namespace MuxCloud.Server.Events
{
    using System;
    using System.Net.WebSockets;
    using System.Threading;
    using System.Threading.Tasks;
    using MuxCloud.Server.Http;
    using MuxCloud.Server.Relay;
    using WatsonWebserver.Core;
    using WatsonWebserver.Core.WebSockets;

    /// <summary>
    /// The account events socket, /v1.0/events.
    /// Thread safety: one instance serves every connection concurrently.
    /// </summary>
    public class EventsEndpoint
    {
        #region Public-Members

        /// <summary>
        /// Heartbeat interval in seconds.
        /// </summary>
        public int HeartbeatSeconds { get; init; } = 25;

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
        public EventsEndpoint(MuxCloudServer server)
        {
            ArgumentNullException.ThrowIfNull(server);
            _Server = server;
        }

        #endregion

        #region Public-Methods

        /// <summary>
        /// Serve one events socket.
        /// </summary>
        /// <param name="ctx">Upgrade context.</param>
        /// <param name="session">Socket.</param>
        /// <returns>Task.</returns>
        public async Task HandleAsync(HttpContextBase ctx, WebSocketSession session)
        {
            ArgumentNullException.ThrowIfNull(ctx);
            ArgumentNullException.ThrowIfNull(session);
            RequestContext? rc = await WebSocketAuth.AuthenticateAsync(ctx, _Server).ConfigureAwait(false);
            if (rc?.Principal == null)
            {
                try
                {
                    await session.CloseAsync((WebSocketCloseStatus)4401, "authentication required", CancellationToken.None).ConfigureAwait(false);
                }
                catch (Exception)
                {
                }

                return;
            }

            EventSubscriber subscriber = new EventSubscriber(rc.Principal.User.Id, session);
            using (CancellationTokenSource lifetime = CancellationTokenSource.CreateLinkedTokenSource(ctx.Token))
            {
                Task pump = Task.Run(() => subscriber.PumpAsync(lifetime.Token), CancellationToken.None);
                _Server.Events.Add(subscriber);
                subscriber.Enqueue(ServerJson.Serialize(new EventMessage { Type = "server.connected", UserId = rc.Principal.User.Id, HeartbeatSeconds = HeartbeatSeconds }));
                Task beat = Task.Run(() => HeartbeatAsync(subscriber, lifetime.Token), CancellationToken.None);
                try
                {
                    await foreach (WebSocketMessage message in session.ReadMessagesAsync(lifetime.Token).ConfigureAwait(false))
                    {
                        if (message.MessageType == WebSocketMessageType.Close) break;
                    }
                }
                catch (Exception)
                {
                }
                finally
                {
                    _Server.Events.Remove(subscriber);
                    lifetime.Cancel();
                    await Task.WhenAny(Task.WhenAll(pump, beat), Task.Delay(2000)).ConfigureAwait(false);
                }
            }
        }

        #endregion

        #region Private-Methods

        private async Task HeartbeatAsync(EventSubscriber subscriber, CancellationToken token)
        {
            try
            {
                using (PeriodicTimer timer = new PeriodicTimer(TimeSpan.FromSeconds(HeartbeatSeconds)))
                {
                    while (await timer.WaitForNextTickAsync(token).ConfigureAwait(false))
                    {
                        subscriber.Enqueue(ServerJson.Serialize(new EventMessage { Type = "ping" }));
                    }
                }
            }
            catch (OperationCanceledException)
            {
            }
        }

        #endregion
    }
}
