namespace MuxCloud.Core.Models
{
    using System;

    /// <summary>
    /// Filter for audit queries.
    /// </summary>
    public class AuditFilter
    {
        #region Public-Members

        /// <summary>
        /// Event type, or null.
        /// </summary>
        public string? EventType { get; set; } = null;

        /// <summary>
        /// User, or null.
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
