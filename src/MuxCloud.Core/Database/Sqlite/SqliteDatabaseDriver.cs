namespace MuxCloud.Core.Database.Sqlite
{
    using System;
    using System.Threading;
    using System.Threading.Tasks;
    using MuxCloud.Core.Database.Sqlite.Implementations;

    /// <summary>
    /// Sqlite database driver.
    /// </summary>
    public class SqliteDatabaseDriver : DatabaseDriverBase
    {
        #region Constructors-and-Factories

        /// <summary>
        /// Instantiate.
        /// </summary>
        /// <param name="settings">Database settings.</param>
        /// <exception cref="ArgumentNullException">settings is null.</exception>
        public SqliteDatabaseDriver(DatabaseSettings settings) : base(new SqliteDialect(settings ?? throw new ArgumentNullException(nameof(settings))))
        {
        }

        #endregion

        #region Public-Methods

        /// <inheritdoc />
        public override async Task InitializeAsync(CancellationToken token = default)
        {
            await Executor.QueryTableAsync("PRAGMA journal_mode = WAL;", false, token).ConfigureAwait(false);
            await ApplyMigrationsAsync(token).ConfigureAwait(false);
        }

        #endregion
    }
}
