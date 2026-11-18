namespace MuxCloud.Core.Responses
{
    using System;
    using System.Text.Json.Serialization;
    using MuxCloud.Core.Models;

    /// <summary>
    /// Response of GET /v1.0/api/auth/me.
    /// </summary>
    public class MeResponse
    {
        #region Public-Members

        /// <summary>
        /// Current user.
        /// </summary>
        [JsonPropertyName("user")]
        public UserDto User { get; set; } = new UserDto();

        /// <summary>
        /// Current session.
        /// </summary>
        [JsonPropertyName("sessionId")]
        public string SessionId { get; set; } = String.Empty;

        /// <summary>
        /// Entitlements.
        /// </summary>
        [JsonPropertyName("entitlements")]
        public EffectiveEntitlements Entitlements { get; set; } = new EffectiveEntitlements();

        #endregion
    }
}
