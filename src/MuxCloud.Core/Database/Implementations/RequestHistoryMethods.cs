namespace MuxCloud.Core.Database.Implementations
{
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Threading;
    using System.Threading.Tasks;
    using MuxCloud.Core.Database.Implementations.Rows;
    using MuxCloud.Core.Database.Interfaces;
    using MuxCloud.Core.Models;

    /// <summary>
    /// Request history data access. Portable SQL; engine differences live in the dialect.
    /// Thread safety: safe to call concurrently.
    /// </summary>
    public class RequestHistoryMethods : IRequestHistoryMethods
    {
        #region Private-Members

        private readonly DatabaseExecutor _Db;

        #endregion

        #region Constructors-and-Factories

        /// <summary>
        /// Instantiate.
        /// </summary>
        /// <param name="db">Executor.</param>
        /// <exception cref="ArgumentNullException">db is null.</exception>
        public RequestHistoryMethods(DatabaseExecutor db)
        {
            ArgumentNullException.ThrowIfNull(db);
            _Db = db;
        }

        #endregion

        #region Public-Methods

        /// <inheritdoc />
        public async Task<RequestHistoryEntry> CreateAsync(RequestHistoryEntry entry, CancellationToken token = default)
        {
            ArgumentNullException.ThrowIfNull(entry);
            await _Db.ExecuteAsync(RequestHistoryEntryRow.Insert, RequestHistoryEntryRow.Parameters(entry), token).ConfigureAwait(false);
            return entry;
        }

        /// <inheritdoc />
        public Task<RequestHistoryEntry?> ReadAsync(string id, CancellationToken token = default)
        {
            return _Db.QueryFirstAsync("SELECT " + RequestHistoryEntryRow.Columns + " FROM request_history WHERE id = @id", new SqlParameters().Add("id", id), RequestHistoryEntryRow.Map, token);
        }

        /// <inheritdoc />
        public async Task<PagedResult<RequestHistoryEntry>> EnumerateAsync(RequestHistoryFilter filter, PageRequest page, CancellationToken token = default)
        {
            WhereBuilder where = Build(filter);
            PagedResult<RequestHistoryEntry> result = await Paging.QueryAsync(_Db, "request_history" + where.Build(), RequestHistoryEntryRow.Columns, "created_utc DESC, id DESC", where.Parameters, page, RequestHistoryEntryRow.Map, token).ConfigureAwait(false);
            foreach (RequestHistoryEntry entry in result.Items)
            {
                entry.RequestBody = String.Empty;
                entry.ResponseBody = String.Empty;
                entry.RequestHeaders = String.Empty;
                entry.ResponseHeaders = String.Empty;
            }

            return result;
        }

        /// <inheritdoc />
        public async Task<bool> DeleteAsync(string id, CancellationToken token = default)
        {
            int rows = await _Db.ExecuteAsync("DELETE FROM request_history WHERE id = @id", new SqlParameters().Add("id", id), token).ConfigureAwait(false);
            return rows > 0;
        }

        /// <inheritdoc />
        public Task<int> DeleteByFilterAsync(RequestHistoryFilter filter, CancellationToken token = default)
        {
            WhereBuilder where = Build(filter);
            return _Db.ExecuteAsync("DELETE FROM request_history" + where.Build(), where.Parameters, token);
        }

        /// <inheritdoc />
        public Task<List<RequestHistoryEntry>> ListRangeAsync(DateTime fromUtc, DateTime toUtc, CancellationToken token = default)
        {
            SqlParameters p = new SqlParameters().Add("from", fromUtc).Add("to", toUtc);
            return _Db.QueryAsync("SELECT created_utc, status_code, duration_ms FROM request_history WHERE created_utc >= @from AND created_utc < @to", p, reader => new RequestHistoryEntry
            {
                CreatedUtc = Converters.Utc(reader, "created_utc"),
                StatusCode = Converters.Int(reader, "status_code"),
                DurationMs = Converters.Double(reader, "duration_ms")
            }, token);
        }

        /// <inheritdoc />
        public Task<int> DeleteOlderThanAsync(DateTime beforeUtc, CancellationToken token = default)
        {
            return _Db.ExecuteAsync("DELETE FROM request_history WHERE created_utc < @t", new SqlParameters().Add("t", beforeUtc), token);
        }

        #endregion

        #region Private-Methods

        private static WhereBuilder Build(RequestHistoryFilter filter)
        {
            ArgumentNullException.ThrowIfNull(filter);
            WhereBuilder where = new WhereBuilder();
            if (!String.IsNullOrEmpty(filter.Method)) where.Add("method = @method", "method", filter.Method.ToUpperInvariant());
            if (filter.StatusCode.HasValue) where.Add("status_code = @status", "status", filter.StatusCode.Value);
            if (!String.IsNullOrEmpty(filter.UserId)) where.Add("user_id = @user_id", "user_id", filter.UserId);
            if (!String.IsNullOrEmpty(filter.TenantId)) where.Add("tenant_id = @tenant_id", "tenant_id", filter.TenantId);
            if (filter.FromUtc.HasValue) where.Add("created_utc >= @from", "from", filter.FromUtc.Value);
            if (filter.ToUtc.HasValue) where.Add("created_utc < @to", "to", filter.ToUtc.Value);
            where.Contains(new[] { "path" }, "q", filter.PathContains);
            return where;
        }

        #endregion
    }
}
