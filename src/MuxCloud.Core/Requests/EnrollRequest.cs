namespace MuxCloud.Core.Requests
{
    using System;
    using System.Text.Json.Serialization;

    /// <summary>
    /// Body of POST /v1.0/api/machines/enroll.
    /// </summary>
    public class EnrollRequest
    {
        #region Public-Members

        /// <summary>
        /// Account email.
        /// </summary>
        [JsonPropertyName("email")]
        public string? Email { get; set; } = null;

        /// <summary>
        /// Account password. Never stored by mux.
        /// </summary>
        [JsonPropertyName("password")]
        public string? Password { get; set; } = null;

        /// <summary>
        /// Display name for the machine.
        /// </summary>
        [JsonPropertyName("machineName")]
        public string? MachineName { get; set; } = null;

        /// <summary>
        /// Host name, optional.
        /// </summary>
        [JsonPropertyName("hostname")]
        public string? Hostname { get; set; } = null;

        /// <summary>
        /// Operating system, optional.
        /// </summary>
        [JsonPropertyName("os")]
        public string? Os { get; set; } = null;

        /// <summary>
        /// Installed mux version, optional.
        /// </summary>
        [JsonPropertyName("muxVersion")]
        public string? MuxVersion { get; set; } = null;

        /// <summary>
        /// Stable per-installation fingerprint, 16 to 128 characters.
        /// </summary>
        [JsonPropertyName("fingerprint")]
        public string? Fingerprint { get; set; } = null;

        #endregion
    }
}
