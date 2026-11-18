namespace MuxCloud.Core.Responses
{
    using System;
    using System.Text.Json.Serialization;

    /// <summary>
    /// An audit record as returned by GET /v1.0/api/admin/audit.
    /// </summary>
    public class AuditRecordDto
    {
        #region Public-Members

        /// <summary>
        /// Audit identifier.
        /// </summary>
        [JsonPropertyName("id")]
        public string Id { get; set; } = String.Empty;

        /// <summary>
        /// Event type, for example auth.login.
        /// </summary>
        [JsonPropertyName("eventType")]
        public string EventType { get; set; } = String.Empty;

        /// <summary>
        /// success, failure, or denied.
        /// </summary>
        [JsonPropertyName("result")]
        public string Result { get; set; } = String.Empty;

        /// <summary>
        /// Failure or denial reason, or empty.
        /// </summary>
        [JsonPropertyName("reason")]
        public string Reason { get; set; } = String.Empty;

        /// <summary>
        /// Acting or affected user, or empty.
        /// </summary>
        [JsonPropertyName("userId")]
        public string UserId { get; set; } = String.Empty;

        /// <summary>
        /// Tenant, or empty.
        /// </summary>
        [JsonPropertyName("tenantId")]
        public string TenantId { get; set; } = String.Empty;

        /// <summary>
        /// Who acted: the user's email when known, else the user identifier, else "system".
        /// </summary>
        [JsonPropertyName("principal")]
        public string Principal { get; set; } = String.Empty;

        /// <summary>
        /// Resource type, or empty.
        /// </summary>
        [JsonPropertyName("resourceType")]
        public string ResourceType { get; set; } = String.Empty;

        /// <summary>
        /// Resource identifier, or empty.
        /// </summary>
        [JsonPropertyName("resourceId")]
        public string ResourceId { get; set; } = String.Empty;

        /// <summary>
        /// Requester IP, or empty.
        /// </summary>
        [JsonPropertyName("sourceIp")]
        public string SourceIp { get; set; } = String.Empty;

        /// <summary>
        /// Request correlation identifier, or empty.
        /// </summary>
        [JsonPropertyName("requestId")]
        public string RequestId { get; set; } = String.Empty;

        /// <summary>
        /// Detail, never secrets.
        /// </summary>
        [JsonPropertyName("message")]
        public string Message { get; set; } = String.Empty;

        /// <summary>
        /// When it happened.
        /// </summary>
        [JsonPropertyName("createdUtc")]
        public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;

        #endregion
    }
}
