namespace MuxCloud.Core.Settings
{
    using System;

    /// <summary>
    /// HTTP listener settings. Changes require a restart.
    /// </summary>
    public class RestSettings
    {
        #region Public-Members

        /// <summary>
        /// Bind address. Default 127.0.0.1; use 0.0.0.0 or * in containers.
        /// </summary>
        public string Hostname
        {
            get { return _Hostname; }
            set { _Hostname = String.IsNullOrWhiteSpace(value) ? "127.0.0.1" : value; }
        }

        /// <summary>
        /// Port. Default 8800, minimum 1, maximum 65535.
        /// </summary>
        public int Port
        {
            get { return _Port; }
            set { _Port = Math.Clamp(value, 1, 65535); }
        }

        /// <summary>
        /// Whether the listener terminates TLS itself. Default false (TLS terminates at the reverse proxy).
        /// </summary>
        public bool Ssl { get; set; } = false;

        #endregion

        #region Private-Members

        private string _Hostname = "127.0.0.1";
        private int _Port = 8800;

        #endregion
    }
}
