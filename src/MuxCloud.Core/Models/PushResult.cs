namespace MuxCloud.Core.Models
{
    using System;

    /// <summary>
    /// The provider's answer for one message.
    /// </summary>
    public class PushResult
    {
        #region Public-Members

        /// <summary>
        /// Expo push token the result is for.
        /// </summary>
        public string To { get; set; } = String.Empty;

        /// <summary>
        /// Whether the provider accepted the message.
        /// </summary>
        public bool Ok { get; set; } = false;

        /// <summary>
        /// Provider error code, for example DeviceNotRegistered, or empty.
        /// </summary>
        public string ErrorCode { get; set; } = String.Empty;

        /// <summary>
        /// Provider message, or empty.
        /// </summary>
        public string Message { get; set; } = String.Empty;

        #endregion
    }
}
