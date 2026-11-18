namespace MuxCloud.Core.Database.Mysql.Implementations
{
    using System;
    using System.Collections.Generic;
    using System.Data.Common;
    using MySql.Data.MySqlClient;
    using MuxCloud.Core.Database.Mysql.Queries;

    /// <summary>
    /// Mysql dialect. MySQL 8 (DDL is not transactional).
    /// Thread safety: immutable after construction.
    /// </summary>
    public class MysqlDialect : SqlDialect
    {
        #region Public-Members

        /// <inheritdoc />
        public override DatabaseTypeEnum Type
        {
            get { return DatabaseTypeEnum.Mysql; }
        }

        /// <inheritdoc />
        public override bool SerializeWrites
        {
            get { return false; }
        }

        /// <inheritdoc />
        public override bool TransactionalDdl
        {
            get { return false; }
        }

        /// <summary>
        /// Connection string in use.
        /// </summary>
        public string ConnectionString { get; }

        #endregion

        #region Private-Members

        private readonly DatabaseSettings _Settings;

        #endregion

        #region Constructors-and-Factories

        /// <summary>
        /// Instantiate.
        /// </summary>
        /// <param name="settings">Database settings.</param>
        /// <exception cref="ArgumentNullException">settings is null.</exception>
        public MysqlDialect(DatabaseSettings settings)
        {
            ArgumentNullException.ThrowIfNull(settings);
            _Settings = settings;
            ConnectionString = BuildConnectionString();
        }

        #endregion

        #region Public-Methods

        /// <inheritdoc />
        public override DbConnection CreateConnection()
        {
            return new MySqlConnection(ConnectionString);
        }

        /// <inheritdoc />
        public override string Page(string orderedQuery)
        {
            return orderedQuery + " LIMIT @limit OFFSET @offset";
        }

        /// <inheritdoc />
        public override string CreateMigrationsTable()
        {
            return MysqlSchemaQueries.CreateMigrationsTable();
        }

        /// <inheritdoc />
        public override IReadOnlyList<SchemaMigration> Migrations()
        {
            return MysqlSchemaQueries.Migrations();
        }

        #endregion

        #region Private-Methods

        private string BuildConnectionString()
        {
            if (!String.IsNullOrWhiteSpace(_Settings.ConnectionString)) return _Settings.ConnectionString;
            MySqlConnectionStringBuilder builder = new MySqlConnectionStringBuilder
            {
                Server = _Settings.Server,
                Port = (uint)(_Settings.Port > 0 ? _Settings.Port : 3306),
                Database = _Settings.DatabaseName,
                UserID = _Settings.Username,
                Password = _Settings.Password,
                Pooling = true,
                AllowUserVariables = true,
                SslMode = MySqlSslMode.Preferred
            };
            return builder.ToString();
        }

        #endregion
    }
}
