namespace MuxCloud.Core.Database.Interfaces
{
    using System;
    using System.Collections.Generic;
    using System.Threading;
    using System.Threading.Tasks;
    using MuxCloud.Core.Models;

    /// <summary>
    /// Audit record data access.
    /// </summary>
    public interface IAuditMethods
    {
        /// <summary>
        /// Create a record.
        /// </summary>
        /// <param name="record">Record to create.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Created record.</returns>
        Task<AuditRecord> CreateAsync(AuditRecord record, CancellationToken token = default);

        /// <summary>
        /// Enumerate records, newest first.
        /// </summary>
        /// <param name="filter">Filter.</param>
        /// <param name="page">Paging.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Page of records.</returns>
        Task<PagedResult<AuditRecord>> EnumerateAsync(AuditFilter filter, PageRequest page, CancellationToken token = default);

        /// <summary>
        /// Delete old records.
        /// </summary>
        /// <param name="beforeUtc">Records created before this time are removed.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Records deleted.</returns>
        Task<int> DeleteOlderThanAsync(DateTime beforeUtc, CancellationToken token = default);
    }
}
