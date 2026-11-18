namespace MuxCloud.Core.Models
{
    using System;
    using System.Collections.Generic;

    /// <summary>
    /// Aggregate request counts over a time range.
    /// </summary>
    public class RequestHistorySummary
    {
        #region Public-Members

        /// <summary>
        /// Requests in range.
        /// </summary>
        public long TotalCount { get; set; } = 0;

        /// <summary>
        /// Requests with status below 400.
        /// </summary>
        public long TotalSuccess { get; set; } = 0;

        /// <summary>
        /// Requests with status 400 or above.
        /// </summary>
        public long TotalFailure { get; set; } = 0;

        /// <summary>
        /// Mean duration.
        /// </summary>
        public double AverageDurationMs { get; set; } = 0;

        /// <summary>
        /// Time buckets, including empty ones.
        /// </summary>
        public List<RequestHistoryBucket> Buckets { get; set; } = new List<RequestHistoryBucket>();

        #endregion
    }
}
