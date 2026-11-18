namespace MuxCloud.Core.Database.SqlServer
{
    using System;
    using System.Threading;
    using System.Threading.Tasks;
    using MuxCloud.Core.Database.SqlServer.Implementations;

    /// <summary>
    /// SqlServer database driver.
    /// </summary>
    public class SqlServerDatabaseDriver : DatabaseDriverBase
    {
        #region Constructors-and-Factories

        /// <summary>
        /// Instantiate.
        /// </summary>
        /// <param name="settings">Database settings.</param>
        /// <exception cref="ArgumentNullException">settings is null.</exception>
        public SqlServerDatabaseDriver(DatabaseSettings settings) : base(new SqlServerDialect(settings ?? throw new ArgumentNullException(nameof(settings))))
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
