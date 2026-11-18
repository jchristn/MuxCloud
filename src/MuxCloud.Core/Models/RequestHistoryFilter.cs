namespace MuxCloud.Core.Models
{
    using System;

    /// <summary>
    /// Filter for request history queries.
    /// </summary>
    public class RequestHistoryFilter
    {
        #region Public-Members

        /// <summary>
        /// HTTP method, or null for any.
        /// </summary>
        public string? Method { get; set; } = null;

        /// <summary>
        /// Status code, or null for any.
        /// </summary>
        public int? StatusCode { get; set; } = null;

        /// <summary>
        /// Case-insensitive path substring, or null.
        /// </summary>
        public string? PathContains { get; set; } = null;

        /// <summary>
        /// Caller, or null.
        /// </summary>
        public string? UserId { get; set; } = null;

        /// <summary>
        /// Tenant, or null.
        /// </summary>
        public string? TenantId { get; set; } = null;

        /// <summary>
        /// Inclusive lower bound, or null.
        /// </summary>
        public DateTime? FromUtc { get; set; } = null;

        /// <summary>
        /// Exclusive upper bound, or null.
        /// </summary>
        public DateTime? ToUtc { get; set; } = null;

        #endregion
    }
}
