namespace MuxCloud.Core.Database
{
    using System.Collections.Generic;
    using System.Data.Common;

    /// <summary>
    /// What differs between database engines: connections, paging, and schema. Every other statement is portable SQL in
    /// the shared implementations.
    /// Thread safety: implementations are immutable after construction.
    /// </summary>
    public abstract class SqlDialect
    {
        #region Public-Members

        /// <summary>
        /// Engine.
        /// </summary>
        public abstract DatabaseTypeEnum Type { get; }

        /// <summary>
        /// Whether writes must be serialized in process (SQLite).
        /// </summary>
        public abstract bool SerializeWrites { get; }

        /// <summary>
        /// Whether DDL statements may run inside a transaction.
        /// </summary>
        public abstract bool TransactionalDdl { get; }

        #endregion

        #region Public-Methods

        /// <summary>
        /// Open a new connection (not yet opened).
        /// </summary>
        /// <returns>Connection.</returns>
        public abstract DbConnection CreateConnection();

        /// <summary>
        /// Append the engine's paging clause to a query that already ends in ORDER BY. The clause uses the @offset and
        /// @limit parameters.
        /// </summary>
        /// <param name="orderedQuery">Query ending in ORDER BY.</param>
        /// <returns>Paged query.</returns>
        public abstract string Page(string orderedQuery);

        /// <summary>
        /// Statement that creates schema_migrations when missing.
        /// </summary>
        /// <returns>DDL.</returns>
        public abstract string CreateMigrationsTable();

        /// <summary>
        /// Every migration for this engine, in version order.
        /// </summary>
        /// <returns>Migrations.</returns>
        public abstract IReadOnlyList<SchemaMigration> Migrations();

        /// <summary>
        /// Statements to run on every new connection, or none.
        /// </summary>
        /// <returns>Statements.</returns>
        public virtual IReadOnlyList<string> ConnectionPragmas()
        {
            return new List<string>();
        }

        #endregion
    }
}
