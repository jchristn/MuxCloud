namespace MuxCloud.Protocol
{
    /// <summary>
    /// WebSocket close codes used on the tunnel. Codes 4000 to 4999 are application-defined by RFC 6455.
    /// Thread safety: immutable; safe to share.
    /// </summary>
    public static class TunnelCloseCodes
    {
        #region Public-Members

        /// <summary>
        /// The first frame was missing, malformed, or not <see cref="TunnelMessageTypes.Hello"/>. The machine retries with backoff.
        /// </summary>
        public const int BadHandshake = 4400;

        /// <summary>
        /// The machine credential is unknown or the proof is wrong. Terminal: the machine stops reconnecting and asks the user to sign in again.
        /// </summary>
        public const int Unauthorized = 4401;

        /// <summary>
        /// The machine was removed or its credential revoked. Terminal.
        /// </summary>
        public const int Revoked = 4403;

        /// <summary>
        /// No heartbeat was answered within the allowed window. The machine reconnects.
        /// </summary>
        public const int HeartbeatTimeout = 4408;

        /// <summary>
        /// A newer connection for the same machine replaced this one. The machine does not reconnect on this connection.
        /// </summary>
        public const int Replaced = 4409;

        /// <summary>
        /// The protocol version is not supported by the server. Terminal until mux is upgraded.
        /// </summary>
        public const int UnsupportedVersion = 4426;

        /// <summary>
        /// Too many failed handshakes; locked out for a while. The machine retries with backoff.
        /// </summary>
        public const int RateLimited = 4429;

        /// <summary>
        /// The server is draining (deploy or restart). The machine reconnects.
        /// </summary>
        public const int Draining = 4503;

        #endregion

        #region Public-Methods

        /// <summary>
        /// Whether a close code means the machine must stop reconnecting until the user acts.
        /// </summary>
        /// <param name="code">Close code.</param>
        /// <returns>True for <see cref="Unauthorized"/>, <see cref="Revoked"/>, and <see cref="UnsupportedVersion"/>.</returns>
        public static bool IsTerminal(int code)
        {
            return code == Unauthorized || code == Revoked || code == UnsupportedVersion;
        }

        #endregion
    }
}
