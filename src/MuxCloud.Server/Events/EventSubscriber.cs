namespace MuxCloud.Server.Events
{
    using System;
    using System.Threading;
    using System.Threading.Channels;
    using System.Threading.Tasks;
    using WatsonWebserver.Core.WebSockets;

    /// <summary>
    /// One connected events socket. Messages are queued and sent on the subscriber's own task.
    /// Thread safety: safe to call concurrently.
    /// </summary>
    public class EventSubscriber
    {
        #region Public-Members

        /// <summary>
        /// Subscriber identifier.
        /// </summary>
        public Guid Id { get; } = Guid.NewGuid();

        /// <summary>
        /// User.
        /// </summary>
        public string UserId { get; }

        /// <summary>
        /// Socket.
        /// </summary>
        public WebSocketSession Session { get; }

        #endregion

        #region Private-Members

        private readonly Channel<string> _Outbound = Channel.CreateBounded<string>(new BoundedChannelOptions(1000) { FullMode = BoundedChannelFullMode.DropOldest, SingleReader = true });

        #endregion

        #region Constructors-and-Factories

        /// <summary>
        /// Instantiate.
        /// </summary>
        /// <param name="userId">User.</param>
        /// <param name="session">Socket.</param>
        public EventSubscriber(string userId, WebSocketSession session)
        {
            UserId = userId ?? String.Empty;
            Session = session ?? throw new ArgumentNullException(nameof(session));
        }

        #endregion

        #region Public-Methods

        /// <summary>
        /// Queue a message.
        /// </summary>
        /// <param name="json">Message JSON.</param>
        public void Enqueue(string json)
        {
            _Outbound.Writer.TryWrite(json);
        }

        /// <summary>
        /// Send queued messages until the token is cancelled or the socket fails.
        /// </summary>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Task.</returns>
        public async Task PumpAsync(CancellationToken token)
        {
            try
            {
                await foreach (string json in _Outbound.Reader.ReadAllAsync(token).ConfigureAwait(false))
                {
                    await Session.SendTextAsync(json, token).ConfigureAwait(false);
                }
            }
            catch (Exception)
            {
                // Socket closed or shutting down.
            }
        }

        /// <summary>
        /// Stop the pump.
        /// </summary>
        public void Complete()
        {
            _Outbound.Writer.TryComplete();
        }

        #endregion
    }
}
