namespace MuxCloud.Core.Responses
{
    using System;
    using System.Text.Json.Serialization;

    /// <summary>
    /// Response of signup.
    /// </summary>
    public class SignupResponse
    {
        #region Public-Members

        /// <summary>
        /// New user.
        /// </summary>
        [JsonPropertyName("userId")]
        public string UserId { get; set; } = String.Empty;

        /// <summary>
        /// Email.
        /// </summary>
        [JsonPropertyName("email")]
        public string Email { get; set; } = String.Empty;

        /// <summary>
        /// pending_verification, or active when verification is not required.
        /// </summary>
        [JsonPropertyName("status")]
        public string Status { get; set; } = "pending_verification";

        #endregion
    }
}
