namespace MuxCloud.Core.Settings
{
    using System;
    using System.Collections.Generic;

    /// <summary>
    /// Logging settings.
    /// </summary>
    public class LoggingSettings
    {
        #region Public-Members

        /// <summary>
        /// Write log lines to the console. Default true.
        /// </summary>
        public bool ConsoleLogging { get; set; } = true;

        /// <summary>
        /// Write log lines to a file. Default false.
        /// </summary>
        public bool FileLogging { get; set; } = false;

        /// <summary>
        /// Directory for log files. Default ./logs.
        /// </summary>
        public string LogDirectory
        {
            get { return _LogDirectory; }
            set { _LogDirectory = String.IsNullOrWhiteSpace(value) ? "./logs" : value; }
        }

        /// <summary>
        /// Log file name. Default muxcloud.log.
        /// </summary>
        public string LogFilename
        {
            get { return _LogFilename; }
            set { _LogFilename = String.IsNullOrWhiteSpace(value) ? "muxcloud.log" : value; }
        }

        /// <summary>
        /// Minimum severity: 0 debug through 7 emergency. Default 1 (info). Minimum 0, maximum 7.
        /// </summary>
        public int MinimumSeverity
        {
            get { return _MinimumSeverity; }
            set { _MinimumSeverity = Math.Clamp(value, 0, 7); }
        }

        /// <summary>
        /// Syslog destinations.
        /// </summary>
        public List<SyslogServerSettings> SyslogServers
        {
            get { return _SyslogServers; }
            set { _SyslogServers = value ?? new List<SyslogServerSettings>(); }
        }

        #endregion

        #region Private-Members

        private string _LogDirectory = "./logs";
        private string _LogFilename = "muxcloud.log";
        private int _MinimumSeverity = 1;
        private List<SyslogServerSettings> _SyslogServers = new List<SyslogServerSettings>();

        #endregion
    }
}
