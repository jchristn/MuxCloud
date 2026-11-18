namespace MuxCloud.Protocol
{
    using System;
    using System.Text.Json.Serialization;

    /// <summary>
    /// Drain notice: the server will close the tunnel; reconnect after <see cref="RetryAfterSeconds"/>.
    /// </summary>
    public class TunnelGoAwayPayload
    {
        #region Public-Members

        /// <summary>
        /// Human-readable reason.
        /// </summary>
        [JsonPropertyName("reason")]
        public string Reason
        {
            get { return _Reason; }
            set { _Reason = value ?? String.Empty; }
        }

        /// <summary>
        /// Seconds to wait before reconnecting. Default 5, minimum 0, maximum 3600.
        /// </summary>
        [JsonPropertyName("retryAfterSeconds")]
        public int RetryAfterSeconds
        {
            get { return _RetryAfterSeconds; }
            set { _RetryAfterSeconds = Math.Clamp(value, 0, 3600); }
        }

        #endregion

        #region Private-Members

        private string _Reason = String.Empty;
        private int _RetryAfterSeconds = 5;

        #endregion
    }
}
