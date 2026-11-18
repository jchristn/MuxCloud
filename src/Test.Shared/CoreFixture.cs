namespace Test.Shared
{
    using System;
    using System.Threading;
    using System.Threading.Tasks;
    using MuxCloud.Core.Database;
    using MuxCloud.Core.Security;
    using MuxCloud.Core.Services;
    using MuxCloud.Core.Settings;

    /// <summary>
    /// A seeded database with the Core services wired together, for service-level tests.
    /// </summary>
    public sealed class CoreFixture : IDisposable
    {
        #region Public-Members

        /// <summary>
        /// Settings (fast password hashing).
        /// </summary>
        public MuxCloudSettings Settings { get; }

        /// <summary>
        /// Database.
        /// </summary>
        public DatabaseDriverBase Db { get; }

        /// <summary>
        /// Notifications.
        /// </summary>
        public RecordingNotifier Notifier { get; } = new RecordingNotifier();

        /// <summary>
        /// Account service.
        /// </summary>
        public AccountService Accounts { get; }

        /// <summary>
        /// Entitlement service.
        /// </summary>
        public EntitlementService Entitlements { get; }

        /// <summary>
        /// Machine service.
        /// </summary>
        public MachineService Machines { get; }

        #endregion

        #region Constructors-and-Factories

        private CoreFixture(MuxCloudSettings settings, DatabaseDriverBase db)
        {
            Settings = settings;
            Db = db;
            TokenProtector protector = new TokenProtector(settings.Auth.SigningKey);
            AuditService audit = new AuditService(db);
            Entitlements = new EntitlementService(db) { CacheLifetime = TimeSpan.Zero };
            Accounts = new AccountService(db, settings, protector, Notifier, audit);
            Machines = new MachineService(db, settings, protector, Accounts, Entitlements, Notifier, audit);
        }

        /// <summary>
        /// Create a fixture on a new database.
        /// </summary>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Fixture.</returns>
        public static async Task<CoreFixture> CreateAsync(CancellationToken token)
        {
            MuxCloudSettings settings = TestSettings.Create(await TestDatabase.CreateAsync(token).ConfigureAwait(false));
            DatabaseDriverBase db = await DatabaseDriverFactory.CreateAndInitializeAsync(settings.Database, token).ConfigureAwait(false);
            await DatabaseSeeder.SeedAsync(db, settings, null, token).ConfigureAwait(false);
            return new CoreFixture(settings, db);
        }

        #endregion

        #region Public-Methods

        /// <summary>
        /// Release the database.
        /// </summary>
        public void Dispose()
        {
            Db.Dispose();
        }

        #endregion
    }
}
