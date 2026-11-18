namespace MuxCloud.Core.Database
{
    using System;
    using System.Collections.Generic;
    using System.Data;
    using System.Data.Common;
    using System.Threading;
    using System.Threading.Tasks;

    /// <summary>
    /// Runs parameterized statements on fresh pooled connections. Writes are serialized when the dialect requires it (SQLite).
    /// Thread safety: safe to call concurrently.
    /// </summary>
    public class DatabaseExecutor : IDisposable
    {
        #region Public-Members

        /// <summary>
        /// Engine dialect.
        /// </summary>
        public SqlDialect Dialect { get; }

        #endregion

        #region Private-Members

        private readonly SemaphoreSlim _WriteLock = new SemaphoreSlim(1, 1);
        private bool _Disposed = false;

        #endregion

        #region Constructors-and-Factories

        /// <summary>
        /// Instantiate.
        /// </summary>
        /// <param name="dialect">Dialect.</param>
        /// <exception cref="ArgumentNullException">dialect is null.</exception>
        public DatabaseExecutor(SqlDialect dialect)
        {
            ArgumentNullException.ThrowIfNull(dialect);
            Dialect = dialect;
        }

        #endregion

        #region Public-Methods

        /// <summary>
        /// Run a statement that changes data.
        /// </summary>
        /// <param name="sql">SQL with @name parameters.</param>
        /// <param name="parameters">Parameters, or null.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Rows affected.</returns>
        public async Task<int> ExecuteAsync(string sql, SqlParameters? parameters, CancellationToken token = default)
        {
            bool locked = await EnterWriteAsync(token).ConfigureAwait(false);
            try
            {
                using (DbConnection connection = await OpenAsync(token).ConfigureAwait(false))
                {
                    using (DbCommand command = CreateCommand(connection, sql, parameters))
                    {
                        return await command.ExecuteNonQueryAsync(token).ConfigureAwait(false);
                    }
                }
            }
            finally
            {
                if (locked) _WriteLock.Release();
            }
        }

        /// <summary>
        /// Run several statements that change data in one transaction.
        /// </summary>
        /// <param name="statements">Statements and their parameters.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Total rows affected.</returns>
        /// <exception cref="ArgumentNullException">statements is null.</exception>
        public async Task<int> ExecuteTransactionAsync(IReadOnlyList<SqlStatement> statements, CancellationToken token = default)
        {
            ArgumentNullException.ThrowIfNull(statements);
            bool locked = await EnterWriteAsync(token).ConfigureAwait(false);
            try
            {
                using (DbConnection connection = await OpenAsync(token).ConfigureAwait(false))
                {
                    using (DbTransaction transaction = await connection.BeginTransactionAsync(token).ConfigureAwait(false))
                    {
                        int total = 0;
                        foreach (SqlStatement statement in statements)
                        {
                            using (DbCommand command = CreateCommand(connection, statement.Sql, statement.Parameters))
                            {
                                command.Transaction = transaction;
                                total += await command.ExecuteNonQueryAsync(token).ConfigureAwait(false);
                            }
                        }

                        await transaction.CommitAsync(token).ConfigureAwait(false);
                        return total;
                    }
                }
            }
            finally
            {
                if (locked) _WriteLock.Release();
            }
        }

        /// <summary>
        /// Run a query and map every row.
        /// </summary>
        /// <typeparam name="T">Row type.</typeparam>
        /// <param name="sql">SQL with @name parameters.</param>
        /// <param name="parameters">Parameters, or null.</param>
        /// <param name="map">Row mapper.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Rows.</returns>
        /// <exception cref="ArgumentNullException">map is null.</exception>
        public async Task<List<T>> QueryAsync<T>(string sql, SqlParameters? parameters, Func<DbDataReader, T> map, CancellationToken token = default)
        {
            ArgumentNullException.ThrowIfNull(map);
            List<T> rows = new List<T>();
            using (DbConnection connection = await OpenAsync(token).ConfigureAwait(false))
            {
                using (DbCommand command = CreateCommand(connection, sql, parameters))
                {
                    using (DbDataReader reader = await command.ExecuteReaderAsync(token).ConfigureAwait(false))
                    {
                        while (await reader.ReadAsync(token).ConfigureAwait(false))
                        {
                            rows.Add(map(reader));
                        }
                    }
                }
            }

            return rows;
        }

        /// <summary>
        /// Run a query and map the first row.
        /// </summary>
        /// <typeparam name="T">Row type.</typeparam>
        /// <param name="sql">SQL with @name parameters.</param>
        /// <param name="parameters">Parameters, or null.</param>
        /// <param name="map">Row mapper.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>First row, or default.</returns>
        public async Task<T?> QueryFirstAsync<T>(string sql, SqlParameters? parameters, Func<DbDataReader, T> map, CancellationToken token = default) where T : class
        {
            List<T> rows = await QueryAsync(sql, parameters, map, token).ConfigureAwait(false);
            return rows.Count > 0 ? rows[0] : null;
        }

        /// <summary>
        /// Run a query that returns one number.
        /// </summary>
        /// <param name="sql">SQL with @name parameters.</param>
        /// <param name="parameters">Parameters, or null.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Value; null is 0.</returns>
        public async Task<long> ScalarAsync(string sql, SqlParameters? parameters, CancellationToken token = default)
        {
            using (DbConnection connection = await OpenAsync(token).ConfigureAwait(false))
            {
                using (DbCommand command = CreateCommand(connection, sql, parameters))
                {
                    object? value = await command.ExecuteScalarAsync(token).ConfigureAwait(false);
                    if (value == null || value is DBNull) return 0L;
                    return Convert.ToInt64(value, System.Globalization.CultureInfo.InvariantCulture);
                }
            }
        }

        /// <summary>
        /// Run a query and return the rows as a table.
        /// </summary>
        /// <param name="sql">SQL.</param>
        /// <param name="isTransaction">Run inside a transaction.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Rows.</returns>
        public async Task<DataTable> QueryTableAsync(string sql, bool isTransaction, CancellationToken token = default)
        {
            bool locked = await EnterWriteAsync(token).ConfigureAwait(false);
            try
            {
                using (DbConnection connection = await OpenAsync(token).ConfigureAwait(false))
                {
                    DbTransaction? transaction = isTransaction ? await connection.BeginTransactionAsync(token).ConfigureAwait(false) : null;
                    try
                    {
                        DataTable table = new DataTable();
                        using (DbCommand command = CreateCommand(connection, sql, null))
                        {
                            command.Transaction = transaction;
                            using (DbDataReader reader = await command.ExecuteReaderAsync(token).ConfigureAwait(false))
                            {
                                table.Load(reader);
                            }
                        }

                        if (transaction != null) await transaction.CommitAsync(token).ConfigureAwait(false);
                        return table;
                    }
                    finally
                    {
                        if (transaction != null) await transaction.DisposeAsync().ConfigureAwait(false);
                    }
                }
            }
            finally
            {
                if (locked) _WriteLock.Release();
            }
        }

        /// <summary>
        /// Release resources.
        /// </summary>
        public void Dispose()
        {
            Dispose(true);
            GC.SuppressFinalize(this);
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
            if (disposing) _WriteLock.Dispose();
            _Disposed = true;
        }

        private async Task<bool> EnterWriteAsync(CancellationToken token)
        {
            if (!Dialect.SerializeWrites) return false;
            await _WriteLock.WaitAsync(token).ConfigureAwait(false);
            return true;
        }

        private async Task<DbConnection> OpenAsync(CancellationToken token)
        {
            DbConnection connection = Dialect.CreateConnection();
            try
            {
                await connection.OpenAsync(token).ConfigureAwait(false);
                foreach (string pragma in Dialect.ConnectionPragmas())
                {
                    using (DbCommand command = connection.CreateCommand())
                    {
                        command.CommandText = pragma;
                        await command.ExecuteNonQueryAsync(token).ConfigureAwait(false);
                    }
                }

                return connection;
            }
            catch
            {
                await connection.DisposeAsync().ConfigureAwait(false);
                throw;
            }
        }

        private static DbCommand CreateCommand(DbConnection connection, string sql, SqlParameters? parameters)
        {
            DbCommand command = connection.CreateCommand();
            command.CommandText = sql;
            if (parameters != null)
            {
                foreach (KeyValuePair<string, object?> pair in parameters.Values)
                {
                    DbParameter parameter = command.CreateParameter();
                    parameter.ParameterName = "@" + pair.Key;
                    parameter.Value = Converters.ToParameter(pair.Value);
                    command.Parameters.Add(parameter);
                }
            }

            return command;
        }

        #endregion
    }
}
