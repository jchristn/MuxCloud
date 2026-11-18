namespace MuxCloud.Core.Requests
{
    using System;
    using System.Text.Json.Serialization;

    /// <summary>
    /// Body of PUT /v1.0/api/account.
    /// </summary>
    public class UpdateProfileRequest
    {
        #region Public-Members

        /// <summary>
        /// First name; null leaves it unchanged.
        /// </summary>
        [JsonPropertyName("firstName")]
        public string? FirstName { get; set; } = null;

        /// <summary>
        /// Last name; null leaves it unchanged.
        /// </summary>
        [JsonPropertyName("lastName")]
        public string? LastName { get; set; } = null;

        #endregion
    }
}
