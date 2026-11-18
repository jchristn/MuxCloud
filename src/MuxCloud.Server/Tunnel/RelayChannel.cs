namespace MuxCloud.Server.Tunnel
{
    using System;
    using System.Net.WebSockets;
    using System.Threading;
    using System.Threading.Channels;
    using System.Threading.Tasks;
    using MuxCloud.Core;
    using MuxCloud.Core.Helpers;
    using WatsonWebserver.Core.WebSockets;

    /// <summary>
    /// One relayed WebSocket: a client socket bridged to a channel on a machine's tunnel. Frames from the machine are queued
    /// and pumped to the client on their own task so a slow client never stalls the tunnel.
    /// Thread safety: safe to call concurrently.
    /// </summary>
    public class RelayChannel
    {
        #region Public-Members

        /// <summary>
        /// Channel identifier (prefix chn_).
        /// </summary>
        public string Id { get; } = IdGenerator.NewId(Constants.ChannelPrefix);

        /// <summary>
        /// Client socket.
        /// </summary>
        public WebSocketSession Client { get; }

        /// <summary>
        /// Completes when the machine reports the channel open (true) or failed (false).
        /// </summary>
        public Task<bool> Opened
        {
            get { return _Opened.Task; }
        }

        /// <summary>
        /// Completes when the channel closes for any reason.
        /// </summary>
        public Task Closed
        {
            get { return _Closed.Task; }
        }

        #endregion

        #region Private-Members

        private readonly TaskCompletionSource<bool> _Opened = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
        private readonly TaskCompletionSource _Closed = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        private readonly Channel<string> _Outbound = Channel.CreateUnbounded<string>(new UnboundedChannelOptions { SingleReader = true });
        private int _CloseRequested = 0;
        private int _CloseCode = 1000;
        private string _CloseReason = String.Empty;

        #endregion

        #region Constructors-and-Factories

        /// <summary>
        /// Instantiate and start pumping machine frames to the client.
        /// </summary>
        /// <param name="client">Client socket.</param>
        /// <param name="token">Lifetime token.</param>
        /// <exception cref="ArgumentNullException">client is null.</exception>
        public RelayChannel(WebSocketSession client, CancellationToken token)
        {
            ArgumentNullException.ThrowIfNull(client);
            Client = client;
            _ = Task.Run(() => PumpAsync(token), CancellationToken.None);
        }

        #endregion

        #region Public-Methods

        /// <summary>
        /// The machine opened the channel.
        /// </summary>
        public void MarkOpened()
        {
            _Opened.TrySetResult(true);
        }

        /// <summary>
        /// Queue a frame for the client.
        /// </summary>
        /// <param name="text">Text.</param>
        public void Enqueue(string text)
        {
            _Outbound.Writer.TryWrite(text ?? String.Empty);
        }

        /// <summary>
        /// Close the client socket after queued frames are delivered.
        /// </summary>
        /// <param name="code">Close code.</param>
        /// <param name="reason">Reason.</param>
        public void Close(int code, string reason)
        {
            if (Interlocked.Exchange(ref _CloseRequested, 1) == 1) return;
            _CloseCode = code;
            _CloseReason = reason ?? String.Empty;
            _Opened.TrySetResult(false);
            _Outbound.Writer.TryComplete();
        }

        #endregion

        #region Private-Methods

        private async Task PumpAsync(CancellationToken token)
        {
            try
            {
                await foreach (string text in _Outbound.Reader.ReadAllAsync(token).ConfigureAwait(false))
                {
                    await Client.SendTextAsync(text, token).ConfigureAwait(false);
                }
            }
            catch (Exception)
            {
                // Client gone or shutting down.
            }

            try
            {
                if (Client.IsConnected) await Client.CloseAsync((WebSocketCloseStatus)_CloseCode, _CloseReason, CancellationToken.None).ConfigureAwait(false);
            }
            catch (Exception)
            {
                // Best effort.
            }

            _Closed.TrySetResult();
        }

        #endregion
    }
}
