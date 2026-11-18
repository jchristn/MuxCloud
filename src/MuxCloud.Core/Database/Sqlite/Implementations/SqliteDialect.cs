namespace MuxCloud.Core.Database.Sqlite.Implementations
{
    using System;
    using System.Collections.Generic;
    using System.Data.Common;
    using Microsoft.Data.Sqlite;
    using MuxCloud.Core.Database.Sqlite.Queries;

    /// <summary>
    /// Sqlite dialect. SQLite: in-process, writes serialized, WAL journal.
    /// Thread safety: immutable after construction.
    /// </summary>
    public class SqliteDialect : SqlDialect
    {
        #region Public-Members

        /// <inheritdoc />
        public override DatabaseTypeEnum Type
        {
            get { return DatabaseTypeEnum.Sqlite; }
        }

        /// <inheritdoc />
        public override bool SerializeWrites
        {
            get { return true; }
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
        private static readonly IReadOnlyList<string> _Pragmas = new List<string> { "PRAGMA busy_timeout = 30000;", "PRAGMA foreign_keys = OFF;" };

        #endregion

        #region Constructors-and-Factories

        /// <summary>
        /// Instantiate.
        /// </summary>
        /// <param name="settings">Database settings.</param>
        /// <exception cref="ArgumentNullException">settings is null.</exception>
        public SqliteDialect(DatabaseSettings settings)
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
            return new SqliteConnection(ConnectionString);
        }

        /// <inheritdoc />
        public override string Page(string orderedQuery)
        {
            return orderedQuery + " LIMIT @limit OFFSET @offset";
        }

        /// <inheritdoc />
        public override string CreateMigrationsTable()
        {
            return SqliteSchemaQueries.CreateMigrationsTable();
        }

        /// <inheritdoc />
        public override IReadOnlyList<SchemaMigration> Migrations()
        {
            return SqliteSchemaQueries.Migrations();
        }

        /// <inheritdoc />
        public override IReadOnlyList<string> ConnectionPragmas()
        {
            return _Pragmas;
        }

        #endregion

        #region Private-Methods

        private string BuildConnectionString()
        {
            if (!String.IsNullOrWhiteSpace(_Settings.ConnectionString)) return _Settings.ConnectionString;
            SqliteConnectionStringBuilder builder = new SqliteConnectionStringBuilder
            {
                DataSource = _Settings.Filename,
                Mode = SqliteOpenMode.ReadWriteCreate,
                Cache = SqliteCacheMode.Default,
                Pooling = true,
                DefaultTimeout = 30
            };
            return builder.ToString();
        }

        #endregion
    }
}
