namespace MuxCloud.Core.Requests
{
    using System;
    using System.Text.Json.Serialization;

    /// <summary>
    /// Body of POST /v1.0/api/admin/email/test.
    /// </summary>
    public class EmailTestRequest
    {
        #region Public-Members

        /// <summary>
        /// Recipient.
        /// </summary>
        [JsonPropertyName("to")]
        public string? To { get; set; } = null;

        #endregion
    }
}
