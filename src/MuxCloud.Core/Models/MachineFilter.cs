namespace MuxCloud.Core.Models
{
    using System;

    /// <summary>
    /// Filter for machine queries.
    /// </summary>
    public class MachineFilter
    {
        #region Public-Members

        /// <summary>
        /// Tenant, or null for any (admin only).
        /// </summary>
        public string? TenantId { get; set; } = null;

        /// <summary>
        /// Owning user, or null.
        /// </summary>
        public string? UserId { get; set; } = null;

        /// <summary>
        /// Case-insensitive substring of the name or host name, or null.
        /// </summary>
        public string? NameContains { get; set; } = null;

        /// <summary>
        /// Whether to include revoked machines.
        /// </summary>
        public bool IncludeRevoked { get; set; } = false;

        #endregion
    }
}
