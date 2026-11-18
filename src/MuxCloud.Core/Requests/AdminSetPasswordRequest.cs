namespace MuxCloud.Core.Requests
{
    using System;
    using System.Text.Json.Serialization;

    /// <summary>
    /// Body of PUT /v1.0/api/admin/users/{id}/password.
    /// </summary>
    public class AdminSetPasswordRequest
    {
        #region Public-Members

        /// <summary>
        /// The user's new password.
        /// </summary>
        [JsonPropertyName("password")]
        public string? Password { get; set; } = null;

        #endregion
    }
}
