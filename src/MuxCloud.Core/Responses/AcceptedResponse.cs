namespace MuxCloud.Core.Responses
{
    using System;
    using System.Text.Json.Serialization;

    /// <summary>
    /// Privacy-preserving acknowledgement.
    /// </summary>
    public class AcceptedResponse
    {
        #region Public-Members

        /// <summary>
        /// Always true.
        /// </summary>
        [JsonPropertyName("accepted")]
        public bool Accepted { get; set; } = true;

        #endregion
    }
}
