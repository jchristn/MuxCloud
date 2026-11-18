namespace MuxCloud.Core.Database
{
    using System;
    using System.Threading;
    using System.Threading.Tasks;
    using MuxCloud.Core.Database.Mysql;
    using MuxCloud.Core.Database.Postgresql;
    using MuxCloud.Core.Database.Sqlite;
    using MuxCloud.Core.Database.SqlServer;

    /// <summary>
    /// Creates the driver for the configured engine.
    /// Thread safety: stateless.
    /// </summary>
    public static class DatabaseDriverFactory
    {
        #region Public-Methods

        /// <summary>
        /// Create a driver.
        /// </summary>
        /// <param name="settings">Database settings.</param>
        /// <returns>Driver (not initialized).</returns>
        /// <exception cref="ArgumentNullException">settings is null.</exception>
        /// <exception cref="ArgumentException">The engine is unknown.</exception>
        public static DatabaseDriverBase Create(DatabaseSettings settings)
        {
            ArgumentNullException.ThrowIfNull(settings);
            switch (settings.Type)
            {
                case DatabaseTypeEnum.Sqlite:
                    return new SqliteDatabaseDriver(settings);
                case DatabaseTypeEnum.Mysql:
                    return new MysqlDatabaseDriver(settings);
                case DatabaseTypeEnum.Postgresql:
                    return new PostgresqlDatabaseDriver(settings);
                case DatabaseTypeEnum.SqlServer:
                    return new SqlServerDatabaseDriver(settings);
                default:
                    throw new ArgumentException("Unknown database type '" + settings.Type + "'.", nameof(settings));
            }
        }

        /// <summary>
        /// Create and initialize a driver.
        /// </summary>
        /// <param name="settings">Database settings.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Initialized driver.</returns>
        /// <exception cref="ArgumentNullException">settings is null.</exception>
        public static async Task<DatabaseDriverBase> CreateAndInitializeAsync(DatabaseSettings settings, CancellationToken token = default)
        {
            DatabaseDriverBase driver = Create(settings);
            try
            {
                await driver.InitializeAsync(token).ConfigureAwait(false);
                return driver;
            }
            catch
            {
                driver.Dispose();
                throw;
            }
        }

        #endregion
    }
}
