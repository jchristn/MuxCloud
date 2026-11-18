namespace MuxCloud.Protocol
{
    using System;
    using System.Text.Json.Serialization;

    /// <summary>
    /// A text message on a relayed WebSocket channel (<see cref="TunnelMessageTypes.WsFrame"/>).
    /// </summary>
    public class WsFramePayload
    {
        #region Public-Members

        /// <summary>
        /// Message text.
        /// </summary>
        [JsonPropertyName("text")]
        public string Text
        {
            get { return _Text; }
            set { _Text = value ?? String.Empty; }
        }

        #endregion

        #region Private-Members

        private string _Text = String.Empty;

        #endregion
    }
}
