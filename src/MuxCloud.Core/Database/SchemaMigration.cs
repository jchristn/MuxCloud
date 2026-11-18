namespace MuxCloud.Core.Database
{
    using System;
    using System.Collections.Generic;

    /// <summary>
    /// One versioned schema change, applied once and recorded in schema_migrations.
    /// </summary>
    public class SchemaMigration
    {
        #region Public-Members

        /// <summary>
        /// Version, starting at 1 and increasing by one.
        /// </summary>
        public int Version { get; }

        /// <summary>
        /// What the migration does.
        /// </summary>
        public string Description { get; }

        /// <summary>
        /// Statements, run in order inside one transaction where the engine supports transactional DDL.
        /// </summary>
        public IReadOnlyList<string> Statements { get; }

        #endregion

        #region Constructors-and-Factories

        /// <summary>
        /// Instantiate.
        /// </summary>
        /// <param name="version">Version, minimum 1.</param>
        /// <param name="description">Description.</param>
        /// <param name="statements">Statements.</param>
        /// <exception cref="ArgumentOutOfRangeException">version is below 1.</exception>
        /// <exception cref="ArgumentNullException">statements is null.</exception>
        public SchemaMigration(int version, string description, IReadOnlyList<string> statements)
        {
            if (version < 1) throw new ArgumentOutOfRangeException(nameof(version), "Migration versions start at 1.");
            ArgumentNullException.ThrowIfNull(statements);
            Version = version;
            Description = description ?? String.Empty;
            Statements = statements;
        }

        #endregion
    }
}
