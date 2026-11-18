namespace MuxCloud.Core.Models
{
    using System;
    using MuxCloud.Core.Helpers;

    /// <summary>
    /// A tenant: the isolation boundary for users and machines. One personal tenant per signup.
    /// </summary>
    public class Tenant
    {
        #region Public-Members

        /// <summary>
        /// Tenant identifier (prefix ten_).
        /// </summary>
        public string Id { get; set; } = IdGenerator.NewId(Constants.TenantPrefix);

        /// <summary>
        /// Owning account.
        /// </summary>
        public string AccountId { get; set; } = String.Empty;

        /// <summary>
        /// Display name.
        /// </summary>
        public string Name { get; set; } = String.Empty;

        /// <summary>
        /// Whether the tenant is active.
        /// </summary>
        public bool Active { get; set; } = true;

        /// <summary>
        /// Whether the tenant is protected from deletion (system tenant).
        /// </summary>
        public bool IsProtected { get; set; } = false;

        /// <summary>
        /// Creation time, UTC.
        /// </summary>
        public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Last update time, UTC.
        /// </summary>
        public DateTime LastUpdateUtc { get; set; } = DateTime.UtcNow;

        #endregion
    }
}
