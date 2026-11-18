namespace MuxCloud.Core.Database
{
    using System;

    /// <summary>
    /// One statement and its parameters, for transactional batches.
    /// </summary>
    public class SqlStatement
    {
        #region Public-Members

        /// <summary>
        /// SQL with @name parameters.
        /// </summary>
        public string Sql { get; }

        /// <summary>
        /// Parameters, or null.
        /// </summary>
        public SqlParameters? Parameters { get; }

        #endregion

        #region Constructors-and-Factories

        /// <summary>
        /// Instantiate.
        /// </summary>
        /// <param name="sql">SQL.</param>
        /// <param name="parameters">Parameters, or null.</param>
        /// <exception cref="ArgumentException">sql is blank.</exception>
        public SqlStatement(string sql, SqlParameters? parameters)
        {
            if (String.IsNullOrWhiteSpace(sql)) throw new ArgumentException("A SQL statement is required.", nameof(sql));
            Sql = sql;
            Parameters = parameters;
        }

        #endregion
    }
}
