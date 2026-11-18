namespace MuxCloud.Core.Database
{
    using System;
    using System.Collections.Generic;

    /// <summary>
    /// Named statement parameters. Names are given without the at sign.
    /// </summary>
    public class SqlParameters
    {
        #region Public-Members

        /// <summary>
        /// Parameter values by name.
        /// </summary>
        public Dictionary<string, object?> Values { get; } = new Dictionary<string, object?>(StringComparer.Ordinal);

        #endregion

        #region Public-Methods

        /// <summary>
        /// Add or replace a parameter.
        /// </summary>
        /// <param name="name">Name without the at sign.</param>
        /// <param name="value">Value; null becomes DBNull.</param>
        /// <returns>This instance.</returns>
        public SqlParameters Add(string name, object? value)
        {
            Values[name] = value;
            return this;
        }

        #endregion
    }
}
