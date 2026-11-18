namespace MuxCloud.Core.Requests
{
    using System;
    using System.Text.Json.Serialization;

    /// <summary>
    /// Body of POST /v1.0/api/account/password.
    /// </summary>
    public class ChangePasswordRequest
    {
        #region Public-Members

        /// <summary>
        /// Current password.
        /// </summary>
        [JsonPropertyName("currentPassword")]
        public string? CurrentPassword { get; set; } = null;

        /// <summary>
        /// New password.
        /// </summary>
        [JsonPropertyName("newPassword")]
        public string? NewPassword { get; set; } = null;

        #endregion
    }
}
