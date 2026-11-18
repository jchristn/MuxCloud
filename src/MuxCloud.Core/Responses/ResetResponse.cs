namespace MuxCloud.Core.Responses
{
    using System;
    using System.Text.Json.Serialization;

    /// <summary>
    /// Response of password reset.
    /// </summary>
    public class ResetResponse
    {
        #region Public-Members

        /// <summary>
        /// Always true.
        /// </summary>
        [JsonPropertyName("reset")]
        public bool Reset { get; set; } = true;

        #endregion
    }
}
