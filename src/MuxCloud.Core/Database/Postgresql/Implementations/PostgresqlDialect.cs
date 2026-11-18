namespace MuxCloud.Core.Database.Postgresql.Implementations
{
    using System;
    using System.Collections.Generic;
    using System.Data.Common;
    using Npgsql;
    using MuxCloud.Core.Database.Postgresql.Queries;

    /// <summary>
    /// Postgresql dialect. PostgreSQL.
    /// Thread safety: immutable after construction.
    /// </summary>
    public class PostgresqlDialect : SqlDialect
    {
        #region Public-Members

        /// <inheritdoc />
        public override DatabaseTypeEnum Type
        {
            get { return DatabaseTypeEnum.Postgresql; }
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
        public PostgresqlDialect(DatabaseSettings settings)
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
            return new NpgsqlConnection(ConnectionString);
        }

        /// <inheritdoc />
        public override string Page(string orderedQuery)
        {
            return orderedQuery + " LIMIT @limit OFFSET @offset";
        }

        /// <inheritdoc />
        public override string CreateMigrationsTable()
        {
            return PostgresqlSchemaQueries.CreateMigrationsTable();
        }

        /// <inheritdoc />
        public override IReadOnlyList<SchemaMigration> Migrations()
        {
            return PostgresqlSchemaQueries.Migrations();
        }

        #endregion

        #region Private-Methods

        private string BuildConnectionString()
        {
            if (!String.IsNullOrWhiteSpace(_Settings.ConnectionString)) return _Settings.ConnectionString;
            NpgsqlConnectionStringBuilder builder = new NpgsqlConnectionStringBuilder
            {
                Host = _Settings.Server,
                Port = _Settings.Port > 0 ? _Settings.Port : 5432,
                Database = _Settings.DatabaseName,
                Username = _Settings.Username,
                Password = _Settings.Password,
                Pooling = true
            };
            return builder.ToString();
        }

        #endregion
    }
}
