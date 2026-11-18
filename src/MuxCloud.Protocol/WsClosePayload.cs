namespace MuxCloud.Protocol
{
    using System;
    using System.Text.Json.Serialization;

    /// <summary>
    /// Close a relayed WebSocket channel (<see cref="TunnelMessageTypes.WsClose"/>).
    /// </summary>
    public class WsClosePayload
    {
        #region Public-Members

        /// <summary>
        /// WebSocket close code. Default 1000 (normal), minimum 1000, maximum 4999.
        /// </summary>
        [JsonPropertyName("code")]
        public int Code
        {
            get { return _Code; }
            set { _Code = Math.Clamp(value, 1000, 4999); }
        }

        /// <summary>
        /// Close reason, or empty.
        /// </summary>
        [JsonPropertyName("reason")]
        public string Reason
        {
            get { return _Reason; }
            set { _Reason = value ?? String.Empty; }
        }

        #endregion

        #region Private-Members

        private int _Code = 1000;
        private string _Reason = String.Empty;

        #endregion
    }
}
