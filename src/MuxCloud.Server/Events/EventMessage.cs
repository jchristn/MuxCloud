namespace MuxCloud.Server.Events
{
    using System;
    using System.Text.Json.Serialization;
    using MuxCloud.Core.Models;
    using MuxCloud.Core.Responses;

    /// <summary>
    /// A message on the account events socket (/v1.0/events). See WEBSOCKETS_API.md section 2.
    /// </summary>
    public class EventMessage
    {
        #region Public-Members

        /// <summary>
        /// Type: server.connected, machine.online, machine.offline, machine.updated, machine.removed, subscription.updated, ping.
        /// </summary>
        [JsonPropertyName("type")]
        public string Type { get; set; } = String.Empty;

        /// <summary>
        /// When the event happened.
        /// </summary>
        [JsonPropertyName("timestampUtc")]
        public DateTime TimestampUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// User (server.connected).
        /// </summary>
        [JsonPropertyName("userId")]
        public string? UserId { get; set; } = null;

        /// <summary>
        /// Heartbeat interval (server.connected).
        /// </summary>
        [JsonPropertyName("heartbeatSeconds")]
        public int? HeartbeatSeconds { get; set; } = null;

        /// <summary>
        /// Machine (machine.online, machine.offline, machine.updated).
        /// </summary>
        [JsonPropertyName("machine")]
        public MachineDto? Machine { get; set; } = null;

        /// <summary>
        /// Machine identifier (machine.removed).
        /// </summary>
        [JsonPropertyName("machineId")]
        public string? MachineId { get; set; } = null;

        /// <summary>
        /// Entitlements (subscription.updated).
        /// </summary>
        [JsonPropertyName("entitlements")]
        public EffectiveEntitlements? Entitlements { get; set; } = null;

        #endregion
    }
}
