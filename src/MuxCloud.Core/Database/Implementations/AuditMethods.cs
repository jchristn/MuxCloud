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
    /// Audit record data access. Portable SQL; engine differences live in the dialect.
    /// Thread safety: safe to call concurrently.
    /// </summary>
    public class AuditMethods : IAuditMethods
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
        public AuditMethods(DatabaseExecutor db)
        {
            ArgumentNullException.ThrowIfNull(db);
            _Db = db;
        }

        #endregion

        #region Public-Methods

        /// <inheritdoc />
        public async Task<AuditRecord> CreateAsync(AuditRecord record, CancellationToken token = default)
        {
            ArgumentNullException.ThrowIfNull(record);
            await _Db.ExecuteAsync(AuditRecordRow.Insert, AuditRecordRow.Parameters(record), token).ConfigureAwait(false);
            return record;
        }

        /// <inheritdoc />
        public Task<PagedResult<AuditRecord>> EnumerateAsync(AuditFilter filter, PageRequest page, CancellationToken token = default)
        {
            ArgumentNullException.ThrowIfNull(filter);
            WhereBuilder where = new WhereBuilder();
            if (!String.IsNullOrEmpty(filter.EventType)) where.Add("event_type = @event_type", "event_type", filter.EventType);
            if (!String.IsNullOrEmpty(filter.UserId)) where.Add("user_id = @user_id", "user_id", filter.UserId);
            if (!String.IsNullOrEmpty(filter.TenantId)) where.Add("tenant_id = @tenant_id", "tenant_id", filter.TenantId);
            if (filter.FromUtc.HasValue) where.Add("created_utc >= @from", "from", filter.FromUtc.Value);
            if (filter.ToUtc.HasValue) where.Add("created_utc < @to", "to", filter.ToUtc.Value);
            return Paging.QueryAsync(_Db, "audit_records" + where.Build(), AuditRecordRow.Columns, "created_utc DESC, id DESC", where.Parameters, page, AuditRecordRow.Map, token);
        }

        /// <inheritdoc />
        public Task<int> DeleteOlderThanAsync(DateTime beforeUtc, CancellationToken token = default)
        {
            return _Db.ExecuteAsync("DELETE FROM audit_records WHERE created_utc < @t", new SqlParameters().Add("t", beforeUtc), token);
        }

        #endregion
    }
}
