namespace MuxCloud.Core.Models
{
    using System;

    /// <summary>
    /// One time bucket of a request history summary.
    /// </summary>
    public class RequestHistoryBucket
    {
        #region Public-Members

        /// <summary>
        /// Bucket start, inclusive.
        /// </summary>
        public DateTime BucketStartUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Bucket end, exclusive.
        /// </summary>
        public DateTime BucketEndUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Requests with status below 400.
        /// </summary>
        public long SuccessCount { get; set; } = 0;

        /// <summary>
        /// Requests with status 400 or above.
        /// </summary>
        public long FailureCount { get; set; } = 0;

        /// <summary>
        /// Mean duration.
        /// </summary>
        public double AverageDurationMs { get; set; } = 0;

        #endregion
    }
}
