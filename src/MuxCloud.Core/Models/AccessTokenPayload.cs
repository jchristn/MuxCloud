namespace MuxCloud.Core.Models
{
    using System;
    using System.Text.Json.Serialization;

    /// <summary>
    /// Contents of an encrypted access token.
    /// </summary>
    public class AccessTokenPayload
    {
        #region Public-Members

        /// <summary>
        /// Session.
        /// </summary>
        [JsonPropertyName("sessionId")]
        public string SessionId { get; set; } = String.Empty;

        /// <summary>
        /// User.
        /// </summary>
        [JsonPropertyName("userId")]
        public string UserId { get; set; } = String.Empty;

        /// <summary>
        /// Tenant.
        /// </summary>
        [JsonPropertyName("tenantId")]
        public string TenantId { get; set; } = String.Empty;

        /// <summary>
        /// Account.
        /// </summary>
        [JsonPropertyName("accountId")]
        public string AccountId { get; set; } = String.Empty;

        /// <summary>
        /// Issue time.
        /// </summary>
        [JsonPropertyName("issuedUtc")]
        public DateTime IssuedUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Expiry.
        /// </summary>
        [JsonPropertyName("expiresUtc")]
        public DateTime ExpiresUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Random nonce.
        /// </summary>
        [JsonPropertyName("nonce")]
        public string Nonce { get; set; } = String.Empty;

        #endregion
    }
}
