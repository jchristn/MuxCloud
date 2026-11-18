namespace MuxCloud.Core.Database.Mysql
{
    using System;
    using System.Threading;
    using System.Threading.Tasks;
    using MuxCloud.Core.Database.Mysql.Implementations;

    /// <summary>
    /// Mysql database driver.
    /// </summary>
    public class MysqlDatabaseDriver : DatabaseDriverBase
    {
        #region Constructors-and-Factories

        /// <summary>
        /// Instantiate.
        /// </summary>
        /// <param name="settings">Database settings.</param>
        /// <exception cref="ArgumentNullException">settings is null.</exception>
        public MysqlDatabaseDriver(DatabaseSettings settings) : base(new MysqlDialect(settings ?? throw new ArgumentNullException(nameof(settings))))
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
