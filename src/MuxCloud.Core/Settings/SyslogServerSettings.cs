namespace MuxCloud.Core.Settings
{
    using System;

    /// <summary>
    /// A syslog destination.
    /// </summary>
    public class SyslogServerSettings
    {
        #region Public-Members

        /// <summary>
        /// Host name. Default 127.0.0.1.
        /// </summary>
        public string Hostname
        {
            get { return _Hostname; }
            set { _Hostname = String.IsNullOrWhiteSpace(value) ? "127.0.0.1" : value; }
        }

        /// <summary>
        /// UDP port. Default 514, minimum 1, maximum 65535.
        /// </summary>
        public int Port
        {
            get { return _Port; }
            set { _Port = Math.Clamp(value, 1, 65535); }
        }

        #endregion

        #region Private-Members

        private string _Hostname = "127.0.0.1";
        private int _Port = 514;

        #endregion
    }
}
