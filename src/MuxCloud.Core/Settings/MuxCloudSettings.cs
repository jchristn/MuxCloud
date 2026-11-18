namespace MuxCloud.Core.Settings
{
    using System;
    using System.Collections.Generic;
    using MuxCloud.Core.Database;

    /// <summary>
    /// Root settings, loaded from muxcloud.json with MUXCLOUD_* environment overrides (see <see cref="SettingsLoader"/>).
    /// </summary>
    public class MuxCloudSettings
    {
        #region Public-Members

        /// <summary>
        /// When the settings file was first created.
        /// </summary>
        public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Public identity and static content.
        /// </summary>
        public ServerSettings Server
        {
            get { return _Server; }
            set { _Server = value ?? new ServerSettings(); }
        }

        /// <summary>
        /// HTTP listener.
        /// </summary>
        public RestSettings Rest
        {
            get { return _Rest; }
            set { _Rest = value ?? new RestSettings(); }
        }

        /// <summary>
        /// Database.
        /// </summary>
        public DatabaseSettings Database
        {
            get { return _Database; }
            set { _Database = value ?? new DatabaseSettings(); }
        }

        /// <summary>
        /// Logging.
        /// </summary>
        public LoggingSettings Logging
        {
            get { return _Logging; }
            set { _Logging = value ?? new LoggingSettings(); }
        }

        /// <summary>
        /// Authentication.
        /// </summary>
        public AuthSettings Auth
        {
            get { return _Auth; }
            set { _Auth = value ?? new AuthSettings(); }
        }

        /// <summary>
        /// Seed administrator.
        /// </summary>
        public AdminSettings Admin
        {
            get { return _Admin; }
            set { _Admin = value ?? new AdminSettings(); }
        }

        /// <summary>
        /// Email.
        /// </summary>
        public EmailSettings Email
        {
            get { return _Email; }
            set { _Email = value ?? new EmailSettings(); }
        }

        /// <summary>
        /// Tunnel and relay.
        /// </summary>
        public TunnelSettings Tunnel
        {
            get { return _Tunnel; }
            set { _Tunnel = value ?? new TunnelSettings(); }
        }

        /// <summary>
        /// Request history capture.
        /// </summary>
        public RequestHistorySettings RequestHistory
        {
            get { return _RequestHistory; }
            set { _RequestHistory = value ?? new RequestHistorySettings(); }
        }

        /// <summary>
        /// Telemetry.
        /// </summary>
        public TelemetrySettings Telemetry
        {
            get { return _Telemetry; }
            set { _Telemetry = value ?? new TelemetrySettings(); }
        }

        /// <summary>
        /// Mobile push notifications.
        /// </summary>
        public PushSettings Push
        {
            get { return _Push; }
            set { _Push = value ?? new PushSettings(); }
        }

        /// <summary>
        /// Setting paths currently overridden by environment variables (not persisted).
        /// </summary>
        [System.Text.Json.Serialization.JsonIgnore]
        public List<string> EnvironmentOverrides { get; } = new List<string>();

        #endregion

        #region Private-Members

        private ServerSettings _Server = new ServerSettings();
        private RestSettings _Rest = new RestSettings();
        private DatabaseSettings _Database = new DatabaseSettings();
        private LoggingSettings _Logging = new LoggingSettings();
        private AuthSettings _Auth = new AuthSettings();
        private AdminSettings _Admin = new AdminSettings();
        private EmailSettings _Email = new EmailSettings();
        private TunnelSettings _Tunnel = new TunnelSettings();
        private RequestHistorySettings _RequestHistory = new RequestHistorySettings();
        private TelemetrySettings _Telemetry = new TelemetrySettings();
        private PushSettings _Push = new PushSettings();

        #endregion
    }
}
