namespace Test.Shared
{
    using System;
    using System.Collections.Concurrent;
    using System.Net.WebSockets;
    using System.Text;
    using System.Threading;
    using System.Threading.Tasks;

    /// <summary>
    /// A minimal browser-or-mobile WebSocket client for relay and events tests.
    /// </summary>
    public sealed class WsClient : IAsyncDisposable
    {
        #region Public-Members

        /// <summary>
        /// Messages received.
        /// </summary>
        public ConcurrentQueue<string> Messages { get; } = new ConcurrentQueue<string>();

        /// <summary>
        /// Close code, once closed.
        /// </summary>
        public int? CloseCode { get; private set; } = null;

        #endregion

        #region Private-Members

        private readonly ClientWebSocket _Socket = new ClientWebSocket();
        private readonly TaskCompletionSource _Closed = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);

        #endregion

        #region Public-Methods

        /// <summary>
        /// Connect.
        /// </summary>
        /// <param name="uri">ws:// URI.</param>
        /// <param name="origin">Origin header, or null.</param>
        /// <param name="cookie">Cookie header, or null.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Task.</returns>
        public async Task ConnectAsync(string uri, string? origin, string? cookie, CancellationToken token)
        {
            if (origin != null) _Socket.Options.SetRequestHeader("Origin", origin);
            if (cookie != null) _Socket.Options.SetRequestHeader("Cookie", cookie);
            await _Socket.ConnectAsync(new Uri(uri), token).ConfigureAwait(false);
            _ = Task.Run(ReceiveAsync, CancellationToken.None);
        }

        /// <summary>
        /// Send text.
        /// </summary>
        /// <param name="text">Text.</param>
        /// <returns>Task.</returns>
        public Task SendAsync(string text)
        {
            return _Socket.SendAsync(Encoding.UTF8.GetBytes(text), WebSocketMessageType.Text, true, CancellationToken.None);
        }

        /// <summary>
        /// Wait for a message containing a substring.
        /// </summary>
        /// <param name="contains">Substring.</param>
        /// <param name="timeout">Timeout.</param>
        /// <returns>The message, or null.</returns>
        public async Task<string?> WaitForAsync(string contains, TimeSpan timeout)
        {
            DateTime until = DateTime.UtcNow + timeout;
            while (DateTime.UtcNow < until)
            {
                foreach (string m in Messages)
                {
                    if (m.Contains(contains, StringComparison.Ordinal)) return m;
                }

                await Task.Delay(20).ConfigureAwait(false);
            }

            return null;
        }

        /// <summary>
        /// Wait for the close.
        /// </summary>
        /// <param name="timeout">Timeout.</param>
        /// <returns>Close code or null.</returns>
        public async Task<int?> WaitClosedAsync(TimeSpan timeout)
        {
            await Task.WhenAny(_Closed.Task, Task.Delay(timeout)).ConfigureAwait(false);
            return CloseCode;
        }

        /// <summary>
        /// Close.
        /// </summary>
        /// <returns>Task.</returns>
        public async ValueTask DisposeAsync()
        {
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

        private async Task ReceiveAsync()
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
                        result = await _Socket.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None).ConfigureAwait(false);
                        if (result.MessageType == WebSocketMessageType.Close) break;
                        text.Append(Encoding.UTF8.GetString(buffer, 0, result.Count));
                    }
                    while (!result.EndOfMessage);
                    if (result.MessageType == WebSocketMessageType.Close)
                    {
                        await AcknowledgeCloseAsync().ConfigureAwait(false);
                        break;
                    }

                    Messages.Enqueue(text.ToString());
                }
            }
            catch (Exception)
            {
            }

            CloseCode = _Socket.CloseStatus.HasValue ? (int)_Socket.CloseStatus.Value : 1006;
            _Closed.TrySetResult();
        }

        #endregion
    }
}
