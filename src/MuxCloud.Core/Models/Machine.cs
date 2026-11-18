namespace MuxCloud.Core.Models
{
    using System;
    using MuxCloud.Core.Helpers;

    /// <summary>
    /// A mux machine enrolled to a user.
    /// </summary>
    public class Machine
    {
        #region Public-Members

        /// <summary>
        /// Machine identifier (prefix mch_).
        /// </summary>
        public string Id { get; set; } = IdGenerator.NewId(Constants.MachinePrefix);

        /// <summary>
        /// Tenant.
        /// </summary>
        public string TenantId { get; set; } = String.Empty;

        /// <summary>
        /// Owning user.
        /// </summary>
        public string UserId { get; set; } = String.Empty;

        /// <summary>
        /// Display name.
        /// </summary>
        public string Name { get; set; } = String.Empty;

        /// <summary>
        /// Host name reported by the machine.
        /// </summary>
        public string Hostname { get; set; } = String.Empty;

        /// <summary>
        /// Operating system reported by the machine.
        /// </summary>
        public string Os { get; set; } = String.Empty;

        /// <summary>
        /// Stable per-installation fingerprint.
        /// </summary>
        public string Fingerprint { get; set; } = String.Empty;

        /// <summary>
        /// Last reported mux version.
        /// </summary>
        public string MuxVersion { get; set; } = String.Empty;

        /// <summary>
        /// Last negotiated tunnel protocol version.
        /// </summary>
        public int ProtocolVersion { get; set; } = 0;

        /// <summary>
        /// Machine secret, AES-256-GCM encrypted.
        /// </summary>
        public string SecretEncrypted { get; set; } = String.Empty;

        /// <summary>
        /// Last four characters of the machine secret.
        /// </summary>
        public string SecretLast4 { get; set; } = String.Empty;

        /// <summary>
        /// Last heartbeat or connection, or null.
        /// </summary>
        public DateTime? LastSeenUtc { get; set; } = null;

        /// <summary>
        /// Last accepted handshake, or null.
        /// </summary>
        public DateTime? LastConnectedUtc { get; set; } = null;

        /// <summary>
        /// Last disconnect, or null.
        /// </summary>
        public DateTime? LastDisconnectedUtc { get; set; } = null;

        /// <summary>
        /// Runs in progress at the last status push.
        /// </summary>
        public int ActiveRuns { get; set; } = 0;

        /// <summary>
        /// Runs waiting for approval at the last status push.
        /// </summary>
        public int AwaitingApproval { get; set; } = 0;

        /// <summary>
        /// Whether the machine accepts remote tool approvals (last status push).
        /// </summary>
        public bool RemoteToolApproval { get; set; } = true;

        /// <summary>
        /// When the credential was revoked, or null.
        /// </summary>
        public DateTime? RevokedUtc { get; set; } = null;

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
