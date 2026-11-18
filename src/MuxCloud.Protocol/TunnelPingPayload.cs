namespace MuxCloud.Protocol
{
    using System;
    using System.Text.Json.Serialization;

    /// <summary>
    /// Heartbeat payload for <see cref="TunnelMessageTypes.Ping"/> and <see cref="TunnelMessageTypes.Pong"/>.
    /// </summary>
    public class TunnelPingPayload
    {
        #region Public-Members

        /// <summary>
        /// Nonce chosen by the pinging side and echoed in the pong.
        /// </summary>
        [JsonPropertyName("nonce")]
        public string Nonce
        {
            get { return _Nonce; }
            set { _Nonce = value ?? String.Empty; }
        }

        #endregion

        #region Private-Members

        private string _Nonce = String.Empty;

        #endregion
    }
}
