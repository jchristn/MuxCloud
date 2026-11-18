namespace Test.Shared
{
    using System;
    using System.Collections.Concurrent;
    using System.Collections.Generic;
    using System.Data.Common;
    using System.IO;
    using System.Threading;
    using System.Threading.Tasks;
    using Microsoft.Data.SqlClient;
    using MuxCloud.Core.Database;
    using MySql.Data.MySqlClient;
    using Npgsql;

    /// <summary>
    /// Creates an isolated database per test on the selected engine. The engine comes from <see cref="Configure"/> (the
    /// console runner's --provider argument) or the MUXCLOUD_TEST_DB_PROVIDER variable, defaulting to Sqlite. Server
    /// engines read MUXCLOUD_TEST_DB_HOST, _PORT, _USER, and _PASSWORD.
    /// Thread safety: safe to call concurrently.
    /// </summary>
    public static class TestDatabase
    {
        #region Public-Members

        /// <summary>
        /// Selected engine.
        /// </summary>
        public static DatabaseTypeEnum Provider
        {
            get
            {
                if (_Provider.HasValue) return _Provider.Value;
                string? env = Environment.GetEnvironmentVariable("MUXCLOUD_TEST_DB_PROVIDER");
                if (!String.IsNullOrWhiteSpace(env) && TryParse(env, out DatabaseTypeEnum parsed)) return parsed;
                return DatabaseTypeEnum.Sqlite;
            }
        }

        #endregion

        #region Private-Members

        private static DatabaseTypeEnum? _Provider = null;
        private static readonly ConcurrentBag<DatabaseSettings> _Created = new ConcurrentBag<DatabaseSettings>();
        private static int _Counter = 0;

        #endregion

        #region Public-Methods

        /// <summary>
        /// Parse a provider name (Sqlite, Mysql, Postgresql, SqlServer; case-insensitive).
        /// </summary>
        /// <param name="value">Name.</param>
        /// <param name="provider">Parsed engine.</param>
        /// <returns>True when recognized.</returns>
        public static bool TryParse(string? value, out DatabaseTypeEnum provider)
        {
            provider = DatabaseTypeEnum.Sqlite;
            if (String.IsNullOrWhiteSpace(value)) return false;
            foreach (DatabaseTypeEnum candidate in Enum.GetValues<DatabaseTypeEnum>())
            {
                if (String.Equals(candidate.ToString(), value.Trim(), StringComparison.OrdinalIgnoreCase))
                {
                    provider = candidate;
                    return true;
                }
            }

            return false;
        }

        /// <summary>
        /// Select the engine for this process.
        /// </summary>
        /// <param name="provider">Engine.</param>
        public static void Configure(DatabaseTypeEnum provider)
        {
            _Provider = provider;
        }

        /// <summary>
        /// Create an empty database and return settings that point at it.
        /// </summary>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Settings.</returns>
        public static async Task<DatabaseSettings> CreateAsync(CancellationToken token = default)
        {
            int n = Interlocked.Increment(ref _Counter);
            string name = "mct_" + Environment.ProcessId + "_" + n + "_" + Guid.NewGuid().ToString("N").Substring(0, 6);
            DatabaseSettings settings = new DatabaseSettings { Type = Provider };
            switch (Provider)
            {
                case DatabaseTypeEnum.Sqlite:
                    settings.Filename = Path.Combine(Path.GetTempPath(), name + ".db");
                    break;
                case DatabaseTypeEnum.Postgresql:
                    Server(settings, 5432, "postgres", "postgres", name);
                    await AdminExecuteAsync("CREATE DATABASE " + name, token).ConfigureAwait(false);
                    break;
                case DatabaseTypeEnum.Mysql:
                    Server(settings, 3306, "root", "root", name);
                    await AdminExecuteAsync("CREATE DATABASE " + name + " CHARACTER SET utf8mb4 COLLATE utf8mb4_bin", token).ConfigureAwait(false);
                    break;
                case DatabaseTypeEnum.SqlServer:
                    Server(settings, 1433, "sa", "MuxCloud!Passw0rd", name);
                    await AdminExecuteAsync("CREATE DATABASE " + name, token).ConfigureAwait(false);
                    break;
            }

            _Created.Add(settings);
            return settings;
        }

        /// <summary>
        /// Create, initialize, and return a driver on a new database.
        /// </summary>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Driver.</returns>
        public static async Task<DatabaseDriverBase> CreateDriverAsync(CancellationToken token = default)
        {
            DatabaseSettings settings = await CreateAsync(token).ConfigureAwait(false);
            return await DatabaseDriverFactory.CreateAndInitializeAsync(settings, token).ConfigureAwait(false);
        }

        /// <summary>
        /// Drop every database this process created (best effort).
        /// </summary>
        /// <returns>Task.</returns>
        public static async Task DropAllAsync()
        {
            while (_Created.TryTake(out DatabaseSettings? settings))
            {
                try
                {
                    switch (settings.Type)
                    {
                        case DatabaseTypeEnum.Sqlite:
                            Microsoft.Data.Sqlite.SqliteConnection.ClearAllPools();
                            foreach (string suffix in new[] { "", "-wal", "-shm" })
                            {
                                if (File.Exists(settings.Filename + suffix)) File.Delete(settings.Filename + suffix);
                            }

                            break;
                        case DatabaseTypeEnum.Postgresql:
                            NpgsqlConnection.ClearAllPools();
                            await AdminExecuteAsync("DROP DATABASE IF EXISTS " + settings.DatabaseName + " WITH (FORCE)", CancellationToken.None).ConfigureAwait(false);
                            break;
                        case DatabaseTypeEnum.Mysql:
                            MySqlConnection.ClearAllPools();
                            await AdminExecuteAsync("DROP DATABASE IF EXISTS " + settings.DatabaseName, CancellationToken.None).ConfigureAwait(false);
                            break;
                        case DatabaseTypeEnum.SqlServer:
                            SqlConnection.ClearAllPools();
                            await AdminExecuteAsync("IF DB_ID('" + settings.DatabaseName + "') IS NOT NULL BEGIN ALTER DATABASE " + settings.DatabaseName + " SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE " + settings.DatabaseName + "; END", CancellationToken.None).ConfigureAwait(false);
                            break;
                    }
                }
                catch (Exception)
                {
                    // Best-effort cleanup.
                }
            }
        }

        #endregion

        #region Private-Methods

        private static void Server(DatabaseSettings settings, int defaultPort, string defaultUser, string defaultPassword, string name)
        {
            settings.Server = Env("MUXCLOUD_TEST_DB_HOST", "127.0.0.1");
            settings.Port = Int32.TryParse(Environment.GetEnvironmentVariable("MUXCLOUD_TEST_DB_PORT"), out int port) ? port : defaultPort;
            settings.Username = Env("MUXCLOUD_TEST_DB_USER", defaultUser);
            settings.Password = Env("MUXCLOUD_TEST_DB_PASSWORD", defaultPassword);
            settings.DatabaseName = name;
        }

        private static string Env(string name, string fallback)
        {
            string? value = Environment.GetEnvironmentVariable(name);
            return String.IsNullOrWhiteSpace(value) ? fallback : value;
        }

        private static async Task AdminExecuteAsync(string sql, CancellationToken token)
        {
            DatabaseSettings admin = new DatabaseSettings { Type = Provider };
            DbConnection connection;
            switch (Provider)
            {
                case DatabaseTypeEnum.Postgresql:
                    Server(admin, 5432, "postgres", "postgres", "postgres");
                    connection = new NpgsqlConnection(new NpgsqlConnectionStringBuilder { Host = admin.Server, Port = admin.Port, Username = admin.Username, Password = admin.Password, Database = "postgres", Pooling = false }.ToString());
                    break;
                case DatabaseTypeEnum.Mysql:
                    Server(admin, 3306, "root", "root", "mysql");
                    connection = new MySqlConnection(new MySqlConnectionStringBuilder { Server = admin.Server, Port = (uint)admin.Port, UserID = admin.Username, Password = admin.Password, Pooling = false, SslMode = MySqlSslMode.Preferred }.ToString());
                    break;
                case DatabaseTypeEnum.SqlServer:
                    Server(admin, 1433, "sa", "MuxCloud!Passw0rd", "master");
                    connection = new SqlConnection(new SqlConnectionStringBuilder { DataSource = admin.Server + "," + admin.Port, UserID = admin.Username, Password = admin.Password, InitialCatalog = "master", TrustServerCertificate = true, Pooling = false }.ToString());
                    break;
                default:
                    return;
            }

            using (connection)
            {
                await connection.OpenAsync(token).ConfigureAwait(false);
                using (DbCommand command = connection.CreateCommand())
                {
                    command.CommandText = sql;
                    await command.ExecuteNonQueryAsync(token).ConfigureAwait(false);
                }
            }
        }

        #endregion
    }
}
