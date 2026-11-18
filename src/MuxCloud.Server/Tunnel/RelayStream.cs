namespace MuxCloud.Server.Tunnel
{
    using System;
    using System.Threading;
    using System.Threading.Channels;
    using MuxCloud.Core;
    using MuxCloud.Core.Helpers;
    using MuxCloud.Protocol;

    /// <summary>
    /// One relayed HTTP request in flight on a tunnel. The tunnel's receive loop writes response frames; the relay handler
    /// reads them. Writes never block the receive loop; a stream that buffers more than <see cref="MaxBufferedBytes"/> is failed.
    /// Thread safety: one writer (the receive loop) and one reader (the relay handler).
    /// </summary>
    public class RelayStream
    {
        #region Public-Members

        /// <summary>
        /// Stream identifier (prefix str_).
        /// </summary>
        public string Id { get; } = IdGenerator.NewId(Constants.StreamPrefix);

        /// <summary>
        /// Response frames, in order.
        /// </summary>
        public ChannelReader<TunnelEnvelope> Frames
        {
            get { return _Channel.Reader; }
        }

        /// <summary>
        /// Largest amount of unread body data, in base64 characters, before the stream is failed. Default 64 MiB.
        /// </summary>
        public long MaxBufferedBytes { get; init; } = 64L * 1024 * 1024;

        #endregion

        #region Private-Members

        private readonly Channel<TunnelEnvelope> _Channel = System.Threading.Channels.Channel.CreateUnbounded<TunnelEnvelope>(new UnboundedChannelOptions { SingleReader = true, SingleWriter = false });
        private long _Buffered = 0;

        #endregion

        #region Public-Methods

        /// <summary>
        /// Queue a frame from the machine.
        /// </summary>
        /// <param name="envelope">Frame.</param>
        public void Write(TunnelEnvelope envelope)
        {
            ArgumentNullException.ThrowIfNull(envelope);
            long size = envelope.HttpChunk?.Data.Length ?? 0;
            if (Interlocked.Add(ref _Buffered, size) > MaxBufferedBytes)
            {
                Fail(TunnelErrorCodes.InternalError, "The client is reading the response too slowly.", 502);
                return;
            }

            _Channel.Writer.TryWrite(envelope);
            if (envelope.Type == TunnelMessageTypes.HttpResponseEnd || envelope.Type == TunnelMessageTypes.StreamError) _Channel.Writer.TryComplete();
        }

        /// <summary>
        /// Record that the reader consumed body data.
        /// </summary>
        /// <param name="size">Base64 characters consumed.</param>
        public void Consumed(long size)
        {
            Interlocked.Add(ref _Buffered, -size);
        }

        /// <summary>
        /// Fail the stream (tunnel lost or replaced).
        /// </summary>
        /// <param name="code">Error code.</param>
        /// <param name="message">Message.</param>
        /// <param name="statusCode">Status for the client when no response has started.</param>
        public void Fail(string code, string message, int statusCode)
        {
            _Channel.Writer.TryWrite(TunnelProtocol.CreateStreamError(Id, code, message, statusCode));
            _Channel.Writer.TryComplete();
        }

        #endregion
    }
}
