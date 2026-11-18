namespace MuxCloud.Core.Database
{
    using System;

    /// <summary>
    /// Database connection settings.
    /// </summary>
    public class DatabaseSettings
    {
        #region Public-Members

        /// <summary>
        /// Engine. Default <see cref="DatabaseTypeEnum.Sqlite"/>.
        /// </summary>
        public DatabaseTypeEnum Type { get; set; } = DatabaseTypeEnum.Sqlite;

        /// <summary>
        /// SQLite file path. Default muxcloud.db.
        /// </summary>
        public string Filename
        {
            get { return _Filename; }
            set { _Filename = String.IsNullOrWhiteSpace(value) ? "muxcloud.db" : value; }
        }

        /// <summary>
        /// Server host name for server engines. Default 127.0.0.1.
        /// </summary>
        public string Server
        {
            get { return _Server; }
            set { _Server = String.IsNullOrWhiteSpace(value) ? "127.0.0.1" : value; }
        }

        /// <summary>
        /// Server port. 0 uses the engine default (5432, 3306, 1433). Minimum 0, maximum 65535.
        /// </summary>
        public int Port
        {
            get { return _Port; }
            set { _Port = Math.Clamp(value, 0, 65535); }
        }

        /// <summary>
        /// Database name for server engines. Default muxcloud.
        /// </summary>
        public string DatabaseName
        {
            get { return _DatabaseName; }
            set { _DatabaseName = String.IsNullOrWhiteSpace(value) ? "muxcloud" : value; }
        }

        /// <summary>
        /// User name for server engines.
        /// </summary>
        public string Username
        {
            get { return _Username; }
            set { _Username = value ?? String.Empty; }
        }

        /// <summary>
        /// Password for server engines. Secret.
        /// </summary>
        public string Password
        {
            get { return _Password; }
            set { _Password = value ?? String.Empty; }
        }

        /// <summary>
        /// Full connection string that replaces the generated one, or empty. Secret.
        /// </summary>
        public string ConnectionString
        {
            get { return _ConnectionString; }
            set { _ConnectionString = value ?? String.Empty; }
        }

        #endregion

        #region Private-Members

        private string _Filename = "muxcloud.db";
        private string _Server = "127.0.0.1";
        private int _Port = 0;
        private string _DatabaseName = "muxcloud";
        private string _Username = String.Empty;
        private string _Password = String.Empty;
        private string _ConnectionString = String.Empty;

        #endregion
    }
}
