namespace MuxCloud.Core.Responses
{
    using System;
    using System.Text.Json.Serialization;

    /// <summary>
    /// Error body.
    /// </summary>
    public class ErrorResponse
    {
        #region Public-Members

        /// <summary>
        /// Stable error code.
        /// </summary>
        [JsonPropertyName("error")]
        public string Error { get; set; } = String.Empty;

        /// <summary>
        /// Human-readable message.
        /// </summary>
        [JsonPropertyName("message")]
        public string Message { get; set; } = String.Empty;

        #endregion
    }
}
