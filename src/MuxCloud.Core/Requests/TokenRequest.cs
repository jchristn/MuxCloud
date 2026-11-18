namespace MuxCloud.Core.Requests
{
    using System;
    using System.Text.Json.Serialization;

    /// <summary>
    /// Body carrying a one-time token (verify).
    /// </summary>
    public class TokenRequest
    {
        #region Public-Members

        /// <summary>
        /// Token value.
        /// </summary>
        [JsonPropertyName("token")]
        public string? Token { get; set; } = null;

        #endregion
    }
}
