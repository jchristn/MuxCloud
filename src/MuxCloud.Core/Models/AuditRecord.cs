namespace MuxCloud.Core.Models
{
    using System;
    using MuxCloud.Core.Helpers;

    /// <summary>
    /// A security or administrative event.
    /// </summary>
    public class AuditRecord
    {
        #region Public-Members

        /// <summary>
        /// Audit identifier (prefix aud_).
        /// </summary>
        public string Id { get; set; } = IdGenerator.NewId(Constants.AuditPrefix);

        /// <summary>
        /// Tenant, or empty for system events.
        /// </summary>
        public string TenantId { get; set; } = String.Empty;

        /// <summary>
        /// Acting or affected user, or empty.
        /// </summary>
        public string UserId { get; set; } = String.Empty;

        /// <summary>
        /// Event type, for example auth.login.
        /// </summary>
        public string EventType { get; set; } = String.Empty;

        /// <summary>
        /// success, failure, or denied.
        /// </summary>
        public string Result { get; set; } = "success";

        /// <summary>
        /// Failure or denial reason.
        /// </summary>
        public string Reason { get; set; } = String.Empty;

        /// <summary>
        /// Resource type, for example machine.
        /// </summary>
        public string ResourceType { get; set; } = String.Empty;

        /// <summary>
        /// Resource identifier.
        /// </summary>
        public string ResourceId { get; set; } = String.Empty;

        /// <summary>
        /// Requester IP.
        /// </summary>
        public string SourceIp { get; set; } = String.Empty;

        /// <summary>
        /// Requester user agent.
        /// </summary>
        public string UserAgent { get; set; } = String.Empty;

        /// <summary>
        /// Request correlation identifier.
        /// </summary>
        public string RequestId { get; set; } = String.Empty;

        /// <summary>
        /// Human-readable detail (never secrets).
        /// </summary>
        public string Message { get; set; } = String.Empty;

        /// <summary>
        /// Creation time, UTC.
        /// </summary>
        public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;

        #endregion
    }
}
