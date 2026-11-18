namespace MuxCloud.Core.Models
{
    using System;
    using System.Collections.Generic;

    /// <summary>
    /// One push notification to one device. Carries no conversation content.
    /// </summary>
    public class PushMessage
    {
        #region Public-Members

        /// <summary>
        /// Expo push token.
        /// </summary>
        public string To { get; set; } = String.Empty;

        /// <summary>
        /// Title (the machine name).
        /// </summary>
        public string Title { get; set; } = String.Empty;

        /// <summary>
        /// Body (a generic phrase).
        /// </summary>
        public string Body { get; set; } = String.Empty;

        /// <summary>
        /// Deep-link data: machineId, sessionId, runId, kind.
        /// </summary>
        public Dictionary<string, string> Data { get; set; } = new Dictionary<string, string>();

        #endregion
    }
}
