namespace MuxCloud.Server.Tunnel
{
    using System;
    using System.Collections.Concurrent;
    using System.Collections.Generic;
    using System.Net.WebSockets;
    using System.Threading;
    using System.Threading.Tasks;
    using MuxCloud.Core.Models;
    using MuxCloud.Protocol;
    using WatsonWebserver.Core.WebSockets;

    /// <summary>
    /// A live, authenticated tunnel from one machine. Sends are serialized through one lock; streams and channels are
    /// tracked so they can be failed together when the tunnel ends.
    /// Thread safety: safe to call concurrently.
    /// </summary>
    public class MachineTunnel
    {
        #region Public-Members

        /// <summary>
        /// Machine identifier.
        /// </summary>
        public string MachineId { get; }

        /// <summary>
        /// Tenant.
        /// </summary>
        public string TenantId { get; }

        /// <summary>
        /// Owning user.
        /// </summary>
        public string UserId { get; }

        /// <summary>
        /// Connection history record; its identifier is the connection identifier.
        /// </summary>
        public MachineConnection Connection { get; }

        /// <summary>
        /// Capabilities in effect.
        /// </summary>
        public IReadOnlyList<string> Capabilities { get; }

        /// <summary>
        /// Largest number of concurrent streams plus channels.
        /// </summary>
        public int MaxConcurrentStreams { get; }

        /// <summary>
        /// Unanswered pings since the last inbound frame.
        /// </summary>
        public int MissedHeartbeats
        {
            get { return Volatile.Read(ref _MissedHeartbeats); }
        }

        /// <summary>
        /// Open streams and channels.
        /// </summary>
        public int OpenCount
        {
            get { return _Streams.Count + _Channels.Count; }
        }

        /// <summary>
        /// Cancelled when the tunnel ends.
        /// </summary>
        public CancellationToken Lifetime
        {
            get { return _Lifetime.Token; }
        }

        /// <summary>
        /// Bytes received from the machine.
        /// </summary>
        public long BytesIn
        {
            get { return Interlocked.Read(ref _BytesIn); }
        }

        /// <summary>
        /// Bytes sent to the machine.
        /// </summary>
        public long BytesOut
        {
            get { return Interlocked.Read(ref _BytesOut); }
        }

        /// <summary>
        /// Close code the server chose, or null when the machine closed first.
        /// </summary>
        public int? ServerCloseCode { get; private set; } = null;

        #endregion

        #region Private-Members

        private readonly WebSocketSession _Session;
        private readonly SemaphoreSlim _SendLock = new SemaphoreSlim(1, 1);
        private readonly CancellationTokenSource _Lifetime = new CancellationTokenSource();
        private readonly ConcurrentDictionary<string, RelayStream> _Streams = new ConcurrentDictionary<string, RelayStream>(StringComparer.Ordinal);
        private readonly ConcurrentDictionary<string, RelayChannel> _Channels = new ConcurrentDictionary<string, RelayChannel>(StringComparer.Ordinal);
        private readonly object _OpenLock = new object();
        private int _MissedHeartbeats = 0;
        private long _BytesIn = 0;
        private long _BytesOut = 0;
        private int _Closed = 0;

        #endregion

        #region Constructors-and-Factories

        /// <summary>
        /// Instantiate.
        /// </summary>
        /// <param name="session">Machine socket.</param>
        /// <param name="machine">Machine record.</param>
        /// <param name="connection">Connection record.</param>
        /// <param name="capabilities">Capabilities in effect.</param>
        /// <param name="maxConcurrentStreams">Concurrent stream limit.</param>
        /// <exception cref="ArgumentNullException">An argument is null.</exception>
        public MachineTunnel(WebSocketSession session, Machine machine, MachineConnection connection, IReadOnlyList<string> capabilities, int maxConcurrentStreams)
        {
            ArgumentNullException.ThrowIfNull(session);
            ArgumentNullException.ThrowIfNull(machine);
            ArgumentNullException.ThrowIfNull(connection);
            _Session = session;
            MachineId = machine.Id;
            TenantId = machine.TenantId;
            UserId = machine.UserId;
            Connection = connection;
            Capabilities = capabilities ?? new List<string>();
            MaxConcurrentStreams = Math.Max(1, maxConcurrentStreams);
        }

        #endregion

        #region Public-Methods

        /// <summary>
        /// Send a frame to the machine.
        /// </summary>
        /// <param name="envelope">Frame.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>True when sent.</returns>
        public async Task<bool> SendAsync(TunnelEnvelope envelope, CancellationToken token = default)
        {
            ArgumentNullException.ThrowIfNull(envelope);
            if (Volatile.Read(ref _Closed) == 1) return false;
            string json = TunnelProtocol.Serialize(envelope);
            using (CancellationTokenSource linked = CancellationTokenSource.CreateLinkedTokenSource(token, _Lifetime.Token))
            {
                try
                {
                    await _SendLock.WaitAsync(linked.Token).ConfigureAwait(false);
                }
                catch (OperationCanceledException)
                {
                    return false;
                }

                try
                {
                    await _Session.SendTextAsync(json, linked.Token).ConfigureAwait(false);
                    Interlocked.Add(ref _BytesOut, json.Length);
                    return true;
                }
                catch (Exception)
                {
                    return false;
                }
                finally
                {
                    _SendLock.Release();
                }
            }
        }

        /// <summary>
        /// Record inbound traffic; resets the heartbeat counter.
        /// </summary>
        /// <param name="bytes">Frame size.</param>
        public void MarkInbound(long bytes)
        {
            Interlocked.Add(ref _BytesIn, bytes);
            Volatile.Write(ref _MissedHeartbeats, 0);
        }

        /// <summary>
        /// Count a ping sent without a reply yet.
        /// </summary>
        /// <returns>Missed count after incrementing.</returns>
        public int CountPing()
        {
            return Interlocked.Increment(ref _MissedHeartbeats);
        }

        /// <summary>
        /// Open a stream when below the concurrency limit.
        /// </summary>
        /// <returns>Stream, or null when at the limit or closed.</returns>
        public RelayStream? TryOpenStream()
        {
            lock (_OpenLock)
            {
                if (Volatile.Read(ref _Closed) == 1 || OpenCount >= MaxConcurrentStreams) return null;
                RelayStream stream = new RelayStream();
                _Streams[stream.Id] = stream;
                return stream;
            }
        }

        /// <summary>
        /// Register a channel when below the concurrency limit.
        /// </summary>
        /// <param name="channel">Channel.</param>
        /// <returns>True when registered.</returns>
        public bool TryOpenChannel(RelayChannel channel)
        {
            ArgumentNullException.ThrowIfNull(channel);
            lock (_OpenLock)
            {
                if (Volatile.Read(ref _Closed) == 1 || OpenCount >= MaxConcurrentStreams) return false;
                _Channels[channel.Id] = channel;
                return true;
            }
        }

        /// <summary>
        /// Find a stream.
        /// </summary>
        /// <param name="id">Stream identifier.</param>
        /// <returns>Stream, or null.</returns>
        public RelayStream? FindStream(string? id)
        {
            return id != null && _Streams.TryGetValue(id, out RelayStream? stream) ? stream : null;
        }

        /// <summary>
        /// Find a channel.
        /// </summary>
        /// <param name="id">Channel identifier.</param>
        /// <returns>Channel, or null.</returns>
        public RelayChannel? FindChannel(string? id)
        {
            return id != null && _Channels.TryGetValue(id, out RelayChannel? channel) ? channel : null;
        }

        /// <summary>
        /// Forget a finished stream.
        /// </summary>
        /// <param name="id">Stream identifier.</param>
        public void RemoveStream(string id)
        {
            _Streams.TryRemove(id, out _);
        }

        /// <summary>
        /// Forget a finished channel.
        /// </summary>
        /// <param name="id">Channel identifier.</param>
        public void RemoveChannel(string id)
        {
            _Channels.TryRemove(id, out _);
        }

        /// <summary>
        /// Close the tunnel: fail every stream with 502, close every relayed client socket with 1001, and close the machine
        /// socket with the given code.
        /// </summary>
        /// <param name="code">Close code (see <see cref="TunnelCloseCodes"/>).</param>
        /// <param name="reason">Reason.</param>
        /// <returns>Task.</returns>
        public async Task CloseAsync(int code, string reason)
        {
            if (Interlocked.Exchange(ref _Closed, 1) == 1) return;
            ServerCloseCode = code;
            FailAll();
            try
            {
                await _Session.CloseAsync((WebSocketCloseStatus)code, reason ?? String.Empty, CancellationToken.None).ConfigureAwait(false);
            }
            catch (Exception)
            {
                // Already gone.
            }

            try
            {
                _Lifetime.Cancel();
            }
            catch (ObjectDisposedException)
            {
            }
        }

        /// <summary>
        /// Mark closed after the machine closed the socket, and fail everything open.
        /// </summary>
        public void MarkClosed()
        {
            if (Interlocked.Exchange(ref _Closed, 1) == 1) return;
            FailAll();
            try
            {
                _Lifetime.Cancel();
            }
            catch (ObjectDisposedException)
            {
            }
        }

        #endregion

        #region Private-Methods

        private void FailAll()
        {
            foreach (KeyValuePair<string, RelayStream> pair in _Streams)
            {
                pair.Value.Fail(TunnelErrorCodes.LoopbackFailed, "The machine disconnected.", 502);
            }

            _Streams.Clear();
            foreach (KeyValuePair<string, RelayChannel> pair in _Channels)
            {
                pair.Value.Close(1001, "machine disconnected");
            }

            _Channels.Clear();
        }

        #endregion
    }
}
