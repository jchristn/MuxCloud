namespace MuxCloud.Core.Responses
{
    using System;
    using System.Text.Json.Serialization;

    /// <summary>
    /// Response of email verification.
    /// </summary>
    public class VerifiedResponse
    {
        #region Public-Members

        /// <summary>
        /// Always true.
        /// </summary>
        [JsonPropertyName("verified")]
        public bool Verified { get; set; } = true;

        /// <summary>
        /// Verified address.
        /// </summary>
        [JsonPropertyName("email")]
        public string Email { get; set; } = String.Empty;

        #endregion
    }
}
