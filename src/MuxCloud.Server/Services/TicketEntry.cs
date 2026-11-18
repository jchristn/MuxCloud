namespace MuxCloud.Server.Services
{
    using System;

    /// <summary>
    /// What a WebSocket ticket stands for.
    /// </summary>
    public class TicketEntry
    {
        #region Public-Members

        /// <summary>
        /// Tenant.
        /// </summary>
        public string TenantId { get; set; } = String.Empty;

        /// <summary>
        /// User.
        /// </summary>
        public string UserId { get; set; } = String.Empty;

        /// <summary>
        /// Session.
        /// </summary>
        public string SessionId { get; set; } = String.Empty;

        /// <summary>
        /// Expiry.
        /// </summary>
        public DateTime ExpiresUtc { get; set; } = DateTime.UtcNow;

        #endregion
    }
}
