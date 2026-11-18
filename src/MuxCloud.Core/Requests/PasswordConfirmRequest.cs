namespace MuxCloud.Core.Requests
{
    using System;
    using System.Text.Json.Serialization;

    /// <summary>
    /// Body carrying only a password confirmation (delete account).
    /// </summary>
    public class PasswordConfirmRequest
    {
        #region Public-Members

        /// <summary>
        /// Current password.
        /// </summary>
        [JsonPropertyName("password")]
        public string? Password { get; set; } = null;

        #endregion
    }
}
