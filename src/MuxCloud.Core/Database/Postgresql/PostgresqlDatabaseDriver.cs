namespace MuxCloud.Core.Database.Postgresql
{
    using System;
    using System.Threading;
    using System.Threading.Tasks;
    using MuxCloud.Core.Database.Postgresql.Implementations;

    /// <summary>
    /// Postgresql database driver.
    /// </summary>
    public class PostgresqlDatabaseDriver : DatabaseDriverBase
    {
        #region Constructors-and-Factories

        /// <summary>
        /// Instantiate.
        /// </summary>
        /// <param name="settings">Database settings.</param>
        /// <exception cref="ArgumentNullException">settings is null.</exception>
        public PostgresqlDatabaseDriver(DatabaseSettings settings) : base(new PostgresqlDialect(settings ?? throw new ArgumentNullException(nameof(settings))))
        {
        }

        #endregion

        #region Public-Methods

        /// <inheritdoc />
        public override async Task InitializeAsync(CancellationToken token = default)
        {
            await ApplyMigrationsAsync(token).ConfigureAwait(false);
        }

        #endregion
    }
}
