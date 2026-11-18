namespace MuxCloud.Core.Database.SqlServer.Implementations
{
    using System;
    using System.Collections.Generic;
    using System.Data.Common;
    using Microsoft.Data.SqlClient;
    using MuxCloud.Core.Database.SqlServer.Queries;

    /// <summary>
    /// SqlServer dialect. Microsoft SQL Server.
    /// Thread safety: immutable after construction.
    /// </summary>
    public class SqlServerDialect : SqlDialect
    {
        #region Public-Members

        /// <inheritdoc />
        public override DatabaseTypeEnum Type
        {
            get { return DatabaseTypeEnum.SqlServer; }
        }

        /// <inheritdoc />
        public override bool SerializeWrites
        {
            get { return false; }
        }

        /// <inheritdoc />
        public override bool TransactionalDdl
        {
            get { return true; }
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
        public SqlServerDialect(DatabaseSettings settings)
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
            return new SqlConnection(ConnectionString);
        }

        /// <inheritdoc />
        public override string Page(string orderedQuery)
        {
            return orderedQuery + " OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY";
        }

        /// <inheritdoc />
        public override string CreateMigrationsTable()
        {
            return SqlServerSchemaQueries.CreateMigrationsTable();
        }

        /// <inheritdoc />
        public override IReadOnlyList<SchemaMigration> Migrations()
        {
            return SqlServerSchemaQueries.Migrations();
        }

        #endregion

        #region Private-Methods

        private string BuildConnectionString()
        {
            if (!String.IsNullOrWhiteSpace(_Settings.ConnectionString)) return _Settings.ConnectionString;
            SqlConnectionStringBuilder builder = new SqlConnectionStringBuilder
            {
                DataSource = _Settings.Server + "," + (_Settings.Port > 0 ? _Settings.Port : 1433),
                InitialCatalog = _Settings.DatabaseName,
                UserID = _Settings.Username,
                Password = _Settings.Password,
                TrustServerCertificate = true,
                Pooling = true
            };
            return builder.ToString();
        }

        #endregion
    }
}
