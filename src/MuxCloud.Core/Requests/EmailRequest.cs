namespace MuxCloud.Core.Requests
{
    using System;
    using System.Text.Json.Serialization;

    /// <summary>
    /// Body carrying only an email (resend verification, forgot password).
    /// </summary>
    public class EmailRequest
    {
        #region Public-Members

        /// <summary>
        /// Email address.
        /// </summary>
        [JsonPropertyName("email")]
        public string? Email { get; set; } = null;

        #endregion
    }
}
