namespace MuxCloud.Core.Models
{
    using System;
    using MuxCloud.Core.Helpers;

    /// <summary>
    /// One tunnel connection, kept as history.
    /// </summary>
    public class MachineConnection
    {
        #region Public-Members

        /// <summary>
        /// Connection identifier (prefix mcn_).
        /// </summary>
        public string Id { get; set; } = IdGenerator.NewId(Constants.ConnectionPrefix);

        /// <summary>
        /// Tenant.
        /// </summary>
        public string TenantId { get; set; } = String.Empty;

        /// <summary>
        /// Machine.
        /// </summary>
        public string MachineId { get; set; } = String.Empty;

        /// <summary>
        /// Server node holding the tunnel.
        /// </summary>
        public string NodeId { get; set; } = String.Empty;

        /// <summary>
        /// Machine's IP address.
        /// </summary>
        public string RemoteIp { get; set; } = String.Empty;

        /// <summary>
        /// Negotiated protocol version.
        /// </summary>
        public int ProtocolVersion { get; set; } = 0;

        /// <summary>
        /// Reported mux version.
        /// </summary>
        public string MuxVersion { get; set; } = String.Empty;

        /// <summary>
        /// When the handshake was accepted.
        /// </summary>
        public DateTime ConnectedUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// When the tunnel closed, or null while open.
        /// </summary>
        public DateTime? DisconnectedUtc { get; set; } = null;

        /// <summary>
        /// WebSocket close code, or null.
        /// </summary>
        public int? CloseCode { get; set; } = null;

        /// <summary>
        /// Close reason.
        /// </summary>
        public string CloseReason { get; set; } = String.Empty;

        /// <summary>
        /// Bytes received from the machine.
        /// </summary>
        public long BytesIn { get; set; } = 0;

        /// <summary>
        /// Bytes sent to the machine.
        /// </summary>
        public long BytesOut { get; set; } = 0;

        #endregion
    }
}
