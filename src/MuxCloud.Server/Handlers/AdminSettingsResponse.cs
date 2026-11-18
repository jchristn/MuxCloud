namespace MuxCloud.Server.Handlers
{
    using System.Collections.Generic;
    using System.Text.Json.Serialization;
    using MuxCloud.Core.Settings;

    /// <summary>
    /// Response of GET /v1.0/api/admin/settings.
    /// </summary>
    public class AdminSettingsResponse
    {
        #region Public-Members

        /// <summary>
        /// Effective settings with secrets replaced by "(set)" or "(not set)".
        /// </summary>
        [JsonPropertyName("settings")]
        public MuxCloudSettings Settings { get; set; } = new MuxCloudSettings();

        /// <summary>
        /// Setting paths overridden by environment variables (read only).
        /// </summary>
        [JsonPropertyName("environmentOverrides")]
        public List<string> EnvironmentOverrides { get; set; } = new List<string>();

        #endregion
    }
}
