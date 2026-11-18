namespace MuxCloud.Core.Database
{
    using System;
    using System.Collections.Generic;
    using System.Data;
    using System.Threading;
    using System.Threading.Tasks;
    using MuxCloud.Core.Database.Implementations;
    using MuxCloud.Core.Database.Interfaces;

    /// <summary>
    /// Base class for database drivers. Exposes the domain method interfaces and applies tracked migrations.
    /// Thread safety: safe to use concurrently after <see cref="InitializeAsync"/>.
    /// </summary>
    public abstract class DatabaseDriverBase : IDisposable, IAsyncDisposable
    {
        #region Public-Members

        /// <summary>
        /// Engine.
        /// </summary>
        public DatabaseTypeEnum DatabaseType
        {
            get { return Executor.Dialect.Type; }
        }

        /// <summary>
        /// Statement executor.
        /// </summary>
        public DatabaseExecutor Executor { get; }

        /// <summary>
        /// Account methods.
        /// </summary>
        public IAccountMethods Accounts { get; protected set; }

        /// <summary>
        /// Tenant methods.
        /// </summary>
        public ITenantMethods Tenants { get; protected set; }

        /// <summary>
        /// User methods.
        /// </summary>
        public IUserMethods Users { get; protected set; }

        /// <summary>
        /// Session methods.
        /// </summary>
        public IAuthSessionMethods Sessions { get; protected set; }

        /// <summary>
        /// One-time token methods.
        /// </summary>
        public IOneTimeTokenMethods OneTimeTokens { get; protected set; }

        /// <summary>
        /// Machine methods.
        /// </summary>
        public IMachineMethods Machines { get; protected set; }

        /// <summary>
        /// Machine connection methods.
        /// </summary>
        public IMachineConnectionMethods MachineConnections { get; protected set; }

        /// <summary>
        /// Plan methods.
        /// </summary>
        public IPlanMethods Plans { get; protected set; }

        /// <summary>
        /// Subscription methods.
        /// </summary>
        public ISubscriptionMethods Subscriptions { get; protected set; }

        /// <summary>
        /// Entitlement override methods.
        /// </summary>
        public IEntitlementOverrideMethods EntitlementOverrides { get; protected set; }

        /// <summary>
        /// Audit methods.
        /// </summary>
        public IAuditMethods Audit { get; protected set; }

        /// <summary>
        /// Request history methods.
        /// </summary>
        public IRequestHistoryMethods RequestHistory { get; protected set; }

        /// <summary>
        /// Migration versions applied by the last <see cref="InitializeAsync"/>.
        /// </summary>
        public List<int> AppliedMigrations { get; } = new List<int>();

        #endregion

        #region Private-Members

        private bool _Disposed = false;

        #endregion

        #region Constructors-and-Factories

        /// <summary>
        /// Instantiate with a dialect.
        /// </summary>
        /// <param name="dialect">Engine dialect.</param>
        /// <exception cref="ArgumentNullException">dialect is null.</exception>
        protected DatabaseDriverBase(SqlDialect dialect)
        {
            ArgumentNullException.ThrowIfNull(dialect);
            Executor = new DatabaseExecutor(dialect);
            Accounts = new AccountMethods(Executor);
            Tenants = new TenantMethods(Executor);
            Users = new UserMethods(Executor);
            Sessions = new AuthSessionMethods(Executor);
            OneTimeTokens = new OneTimeTokenMethods(Executor);
            Machines = new MachineMethods(Executor);
            MachineConnections = new MachineConnectionMethods(Executor);
            Plans = new PlanMethods(Executor);
            Subscriptions = new SubscriptionMethods(Executor);
            EntitlementOverrides = new EntitlementOverrideMethods(Executor);
            Audit = new AuditMethods(Executor);
            RequestHistory = new RequestHistoryMethods(Executor);
        }

        #endregion

        #region Public-Methods

        /// <summary>
        /// Prepare the database: engine setup and pending migrations.
        /// </summary>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Task.</returns>
        public abstract Task InitializeAsync(CancellationToken token = default);

        /// <summary>
        /// Run one statement and return its rows.
        /// </summary>
        /// <param name="query">SQL.</param>
        /// <param name="isTransaction">Run inside a transaction.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Rows.</returns>
        public Task<DataTable> ExecuteQueryAsync(string query, bool isTransaction = false, CancellationToken token = default)
        {
            return Executor.QueryTableAsync(query, isTransaction, token);
        }

        /// <summary>
        /// Run several statements; the last one's rows are returned.
        /// </summary>
        /// <param name="queries">Statements.</param>
        /// <param name="isTransaction">Run inside one transaction.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Rows of the last statement.</returns>
        /// <exception cref="ArgumentNullException">queries is null.</exception>
        public async Task<DataTable> ExecuteQueriesAsync(IEnumerable<string> queries, bool isTransaction = false, CancellationToken token = default)
        {
            ArgumentNullException.ThrowIfNull(queries);
            List<string> list = new List<string>(queries);
            if (list.Count == 0) return new DataTable();
            if (isTransaction)
            {
                List<SqlStatement> statements = new List<SqlStatement>();
                for (int i = 0; i < list.Count - 1; i++) statements.Add(new SqlStatement(list[i], null));
                if (statements.Count > 0) await Executor.ExecuteTransactionAsync(statements, token).ConfigureAwait(false);
            }
            else
            {
                for (int i = 0; i < list.Count - 1; i++) await Executor.ExecuteAsync(list[i], null, token).ConfigureAwait(false);
            }

            return await Executor.QueryTableAsync(list[list.Count - 1], false, token).ConfigureAwait(false);
        }

        /// <summary>
        /// Close the driver. Connections are pooled per operation, so this only releases the executor.
        /// </summary>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Task.</returns>
        public Task CloseAsync(CancellationToken token = default)
        {
            Dispose();
            return Task.CompletedTask;
        }

        /// <summary>
        /// Release resources.
        /// </summary>
        public void Dispose()
        {
            Dispose(true);
            GC.SuppressFinalize(this);
        }

        /// <summary>
        /// Release resources asynchronously.
        /// </summary>
        /// <returns>Task.</returns>
        public ValueTask DisposeAsync()
        {
            Dispose();
            return ValueTask.CompletedTask;
        }

        #endregion

        #region Private-Methods

        /// <summary>
        /// Release resources.
        /// </summary>
        /// <param name="disposing">Whether managed resources are released.</param>
        protected virtual void Dispose(bool disposing)
        {
            if (_Disposed) return;
            if (disposing) Executor.Dispose();
            _Disposed = true;
        }

        /// <summary>
        /// Create schema_migrations and apply every migration not yet recorded, in version order.
        /// </summary>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Task.</returns>
        protected async Task ApplyMigrationsAsync(CancellationToken token)
        {
            await Executor.ExecuteAsync(Executor.Dialect.CreateMigrationsTable(), null, token).ConfigureAwait(false);
            List<long> applied = await Executor.QueryAsync("SELECT version FROM schema_migrations", null, reader => Converters.Long(reader, "version"), token).ConfigureAwait(false);
            HashSet<long> done = new HashSet<long>(applied);
            AppliedMigrations.Clear();
            foreach (SchemaMigration migration in Executor.Dialect.Migrations())
            {
                if (done.Contains(migration.Version)) continue;
                SqlStatement record = new SqlStatement("INSERT INTO schema_migrations (version, description, applied_utc) VALUES (@v, @d, @t)",
                    new SqlParameters().Add("v", migration.Version).Add("d", migration.Description).Add("t", DateTime.UtcNow));
                if (Executor.Dialect.TransactionalDdl)
                {
                    List<SqlStatement> statements = new List<SqlStatement>();
                    foreach (string sql in migration.Statements) statements.Add(new SqlStatement(sql, null));
                    statements.Add(record);
                    await Executor.ExecuteTransactionAsync(statements, token).ConfigureAwait(false);
                }
                else
                {
                    foreach (string sql in migration.Statements) await Executor.ExecuteAsync(sql, null, token).ConfigureAwait(false);
                    await Executor.ExecuteAsync(record.Sql, record.Parameters, token).ConfigureAwait(false);
                }

                AppliedMigrations.Add(migration.Version);
            }
        }

        #endregion
    }
}
