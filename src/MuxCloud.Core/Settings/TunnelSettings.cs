namespace MuxCloud.Core.Settings
{
    using System;

    /// <summary>
    /// Tunnel and relay settings.
    /// </summary>
    public class TunnelSettings
    {
        #region Public-Members

        /// <summary>
        /// Heartbeat interval sent in the welcome, in seconds. Default 20, minimum 5, maximum 300.
        /// </summary>
        public int HeartbeatSeconds
        {
            get { return _HeartbeatSeconds; }
            set { _HeartbeatSeconds = Math.Clamp(value, 5, 300); }
        }

        /// <summary>
        /// Consecutive unanswered pings before a tunnel is considered dead. Default 3, minimum 1, maximum 20.
        /// </summary>
        public int MissedHeartbeats
        {
            get { return _MissedHeartbeats; }
            set { _MissedHeartbeats = Math.Clamp(value, 1, 20); }
        }

        /// <summary>
        /// Seconds to wait for the hello frame. Default 15, minimum 1, maximum 120.
        /// </summary>
        public int HandshakeTimeoutSeconds
        {
            get { return _HandshakeTimeoutSeconds; }
            set { _HandshakeTimeoutSeconds = Math.Clamp(value, 1, 120); }
        }

        /// <summary>
        /// Concurrent relay streams and channels per tunnel. Default 32, minimum 1, maximum 1024.
        /// </summary>
        public int MaxConcurrentStreams
        {
            get { return _MaxConcurrentStreams; }
            set { _MaxConcurrentStreams = Math.Clamp(value, 1, 1024); }
        }

        /// <summary>
        /// Largest relayed request body in bytes. Default 8388608 (8 MiB), minimum 1024, maximum 104857600.
        /// </summary>
        public long MaxRequestBodyBytes
        {
            get { return _MaxRequestBodyBytes; }
            set { _MaxRequestBodyBytes = Math.Clamp(value, 1024L, 104857600L); }
        }

        /// <summary>
        /// Seconds to wait for a relayed response to start. Default 30, minimum 1, maximum 600.
        /// </summary>
        public int FirstByteTimeoutSeconds
        {
            get { return _FirstByteTimeoutSeconds; }
            set { _FirstByteTimeoutSeconds = Math.Clamp(value, 1, 600); }
        }

        /// <summary>
        /// Failed handshakes per IP or machine within <see cref="HandshakeFailureWindowSeconds"/> before a lockout. Default 10, minimum 1, maximum 1000.
        /// </summary>
        public int MaxHandshakeFailures
        {
            get { return _MaxHandshakeFailures; }
            set { _MaxHandshakeFailures = Math.Clamp(value, 1, 1000); }
        }

        /// <summary>
        /// Window for counting handshake failures, in seconds. Default 900, minimum 10, maximum 86400.
        /// </summary>
        public int HandshakeFailureWindowSeconds
        {
            get { return _HandshakeFailureWindowSeconds; }
            set { _HandshakeFailureWindowSeconds = Math.Clamp(value, 10, 86400); }
        }

        /// <summary>
        /// Seconds a machine is told to wait before reconnecting after a drain. Default 5, minimum 0, maximum 3600.
        /// </summary>
        public int DrainRetryAfterSeconds
        {
            get { return _DrainRetryAfterSeconds; }
            set { _DrainRetryAfterSeconds = Math.Clamp(value, 0, 3600); }
        }

        #endregion

        #region Private-Members

        private int _HeartbeatSeconds = 20;
        private int _MissedHeartbeats = 3;
        private int _HandshakeTimeoutSeconds = 15;
        private int _MaxConcurrentStreams = 32;
        private long _MaxRequestBodyBytes = 8L * 1024 * 1024;
        private int _FirstByteTimeoutSeconds = 30;
        private int _MaxHandshakeFailures = 10;
        private int _HandshakeFailureWindowSeconds = 900;
        private int _DrainRetryAfterSeconds = 5;

        #endregion
    }
}
