namespace MuxCloud.Core.Responses
{
    using System;
    using System.Text.Json.Serialization;

    /// <summary>
    /// A machine as returned by the API.
    /// </summary>
    public class MachineDto
    {
        #region Public-Members

        /// <summary>
        /// Machine identifier.
        /// </summary>
        [JsonPropertyName("id")]
        public string Id { get; set; } = String.Empty;

        /// <summary>
        /// Name.
        /// </summary>
        [JsonPropertyName("name")]
        public string Name { get; set; } = String.Empty;

        /// <summary>
        /// Host name.
        /// </summary>
        [JsonPropertyName("hostname")]
        public string Hostname { get; set; } = String.Empty;

        /// <summary>
        /// Operating system.
        /// </summary>
        [JsonPropertyName("os")]
        public string Os { get; set; } = String.Empty;

        /// <summary>
        /// mux version.
        /// </summary>
        [JsonPropertyName("muxVersion")]
        public string MuxVersion { get; set; } = String.Empty;

        /// <summary>
        /// Tunnel protocol version.
        /// </summary>
        [JsonPropertyName("protocolVersion")]
        public int ProtocolVersion { get; set; } = 0;

        /// <summary>
        /// Whether a tunnel is connected.
        /// </summary>
        [JsonPropertyName("online")]
        public bool Online { get; set; } = false;

        /// <summary>
        /// Last seen.
        /// </summary>
        [JsonPropertyName("lastSeenUtc")]
        public DateTime? LastSeenUtc { get; set; } = null;

        /// <summary>
        /// Last connected.
        /// </summary>
        [JsonPropertyName("lastConnectedUtc")]
        public DateTime? LastConnectedUtc { get; set; } = null;

        /// <summary>
        /// Last disconnected.
        /// </summary>
        [JsonPropertyName("lastDisconnectedUtc")]
        public DateTime? LastDisconnectedUtc { get; set; } = null;

        /// <summary>
        /// Runs in progress.
        /// </summary>
        [JsonPropertyName("activeRuns")]
        public int ActiveRuns { get; set; } = 0;

        /// <summary>
        /// Runs awaiting approval.
        /// </summary>
        [JsonPropertyName("awaitingApproval")]
        public int AwaitingApproval { get; set; } = 0;

        /// <summary>
        /// Whether remote tool approval is enabled on the machine.
        /// </summary>
        [JsonPropertyName("remoteToolApproval")]
        public bool RemoteToolApproval { get; set; } = true;

        /// <summary>
        /// Last four characters of the machine secret.
        /// </summary>
        [JsonPropertyName("secretLast4")]
        public string SecretLast4 { get; set; } = String.Empty;

        /// <summary>
        /// Whether the credential is revoked.
        /// </summary>
        [JsonPropertyName("revoked")]
        public bool Revoked { get; set; } = false;

        /// <summary>
        /// Owner (admin views).
        /// </summary>
        [JsonPropertyName("userId")]
        public string UserId { get; set; } = String.Empty;

        /// <summary>
        /// Enrollment time.
        /// </summary>
        [JsonPropertyName("createdUtc")]
        public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;

        #endregion
    }
}
