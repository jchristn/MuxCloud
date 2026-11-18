namespace MuxCloud.Core.Helpers
{
    using System;

    /// <summary>
    /// Creates k-sortable, prefixed identifiers with PrettyId.
    /// Thread safety: safe to call concurrently.
    /// </summary>
    public static class IdGenerator
    {
        #region Public-Members

        /// <summary>
        /// Total identifier length including the prefix.
        /// </summary>
        public const int IdLength = 32;

        #endregion

        #region Private-Members

        private static readonly PrettyId.IdGenerator _Generator = new PrettyId.IdGenerator();
        private static readonly object _Lock = new object();

        #endregion

        #region Public-Methods

        /// <summary>
        /// Create a new identifier.
        /// </summary>
        /// <param name="prefix">Prefix ending in an underscore, for example usr_.</param>
        /// <returns>Identifier of <see cref="IdLength"/> characters.</returns>
        /// <exception cref="ArgumentException">prefix is blank.</exception>
        public static string NewId(string prefix)
        {
            if (String.IsNullOrWhiteSpace(prefix)) throw new ArgumentException("An identifier prefix is required.", nameof(prefix));
            lock (_Lock)
            {
                return _Generator.GenerateKSortable(prefix, IdLength);
            }
        }

        #endregion
    }
}
