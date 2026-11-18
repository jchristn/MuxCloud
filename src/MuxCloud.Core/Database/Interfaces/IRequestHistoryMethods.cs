namespace MuxCloud.Core.Database.Interfaces
{
    using System;
    using System.Collections.Generic;
    using System.Threading;
    using System.Threading.Tasks;
    using MuxCloud.Core.Models;

    /// <summary>
    /// Request history data access.
    /// </summary>
    public interface IRequestHistoryMethods
    {
        /// <summary>
        /// Create an entry.
        /// </summary>
        /// <param name="entry">Entry to create.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Created entry.</returns>
        Task<RequestHistoryEntry> CreateAsync(RequestHistoryEntry entry, CancellationToken token = default);

        /// <summary>
        /// Read an entry.
        /// </summary>
        /// <param name="id">Entry identifier.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Entry, or null.</returns>
        Task<RequestHistoryEntry?> ReadAsync(string id, CancellationToken token = default);

        /// <summary>
        /// Enumerate entries without bodies, newest first.
        /// </summary>
        /// <param name="filter">Filter.</param>
        /// <param name="page">Paging.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Page of entries.</returns>
        Task<PagedResult<RequestHistoryEntry>> EnumerateAsync(RequestHistoryFilter filter, PageRequest page, CancellationToken token = default);

        /// <summary>
        /// Delete an entry.
        /// </summary>
        /// <param name="id">Entry identifier.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>True if one was deleted.</returns>
        Task<bool> DeleteAsync(string id, CancellationToken token = default);

        /// <summary>
        /// Delete entries matching a filter.
        /// </summary>
        /// <param name="filter">Filter.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Entries deleted.</returns>
        Task<int> DeleteByFilterAsync(RequestHistoryFilter filter, CancellationToken token = default);

        /// <summary>
        /// Status, duration, and time of every entry in a range, for summaries.
        /// </summary>
        /// <param name="fromUtc">Inclusive start.</param>
        /// <param name="toUtc">Exclusive end.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Entries with only those fields set.</returns>
        Task<List<RequestHistoryEntry>> ListRangeAsync(DateTime fromUtc, DateTime toUtc, CancellationToken token = default);

        /// <summary>
        /// Delete old entries.
        /// </summary>
        /// <param name="beforeUtc">Entries created before this time are removed.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Entries deleted.</returns>
        Task<int> DeleteOlderThanAsync(DateTime beforeUtc, CancellationToken token = default);
    }
}
