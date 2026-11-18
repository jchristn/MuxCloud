namespace MuxCloud.Core.Database.Implementations
{
    using System;
    using System.Collections.Generic;

    /// <summary>
    /// Builds a WHERE clause from optional conditions, adding parameters as it goes.
    /// Thread safety: not thread safe; use one instance per query.
    /// </summary>
    public class WhereBuilder
    {
        #region Public-Members

        /// <summary>
        /// Parameters gathered so far.
        /// </summary>
        public SqlParameters Parameters { get; } = new SqlParameters();

        #endregion

        #region Private-Members

        private readonly List<string> _Conditions = new List<string>();

        #endregion

        #region Public-Methods

        /// <summary>
        /// Add a condition with no parameter.
        /// </summary>
        /// <param name="condition">SQL condition.</param>
        /// <returns>This instance.</returns>
        public WhereBuilder Add(string condition)
        {
            if (!String.IsNullOrWhiteSpace(condition)) _Conditions.Add(condition);
            return this;
        }

        /// <summary>
        /// Add a condition and its parameter.
        /// </summary>
        /// <param name="condition">SQL condition using @name.</param>
        /// <param name="name">Parameter name without the at sign.</param>
        /// <param name="value">Value.</param>
        /// <returns>This instance.</returns>
        public WhereBuilder Add(string condition, string name, object? value)
        {
            _Conditions.Add(condition);
            Parameters.Add(name, value);
            return this;
        }

        /// <summary>
        /// Add a case-insensitive substring match on one or more columns (OR across columns).
        /// </summary>
        /// <param name="columns">Columns.</param>
        /// <param name="name">Parameter name.</param>
        /// <param name="value">Substring; blank adds nothing.</param>
        /// <returns>This instance.</returns>
        public WhereBuilder Contains(IReadOnlyList<string> columns, string name, string? value)
        {
            if (String.IsNullOrWhiteSpace(value) || columns == null || columns.Count == 0) return this;
            List<string> parts = new List<string>();
            foreach (string column in columns) parts.Add("LOWER(" + column + ") LIKE @" + name);
            _Conditions.Add("(" + String.Join(" OR ", parts) + ")");
            Parameters.Add(name, "%" + value.Trim().ToLowerInvariant().Replace("%", "").Replace("_", "") + "%");
            return this;
        }

        /// <summary>
        /// The clause, starting with " WHERE ", or empty.
        /// </summary>
        /// <returns>Clause.</returns>
        public string Build()
        {
            return _Conditions.Count == 0 ? String.Empty : " WHERE " + String.Join(" AND ", _Conditions);
        }

        #endregion
    }
}
