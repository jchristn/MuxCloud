namespace MuxCloud.Protocol
{
    using System;
    using System.Text.Json.Serialization;

    /// <summary>
    /// Body of <c>POST /v1.0/api/machines/sign-out</c> (<see cref="TunnelProtocol.SignOutPath"/>). A machine sends it
    /// when its owner signs it out locally, so the cloud revokes it right away instead of listing it as offline. The
    /// request carries no password or token: it is authenticated by <see cref="Proof"/>, computed with
    /// <see cref="TunnelProof.ComputeSignOutProof"/> over the machine secret.
    /// </summary>
    public class MachineSignOutRequest
    {
        #region Public-Members

        /// <summary>
        /// Machine identifier.
        /// </summary>
        [JsonPropertyName("machineId")]
        public string MachineId
        {
            get { return _MachineId; }
            set { _MachineId = value ?? String.Empty; }
        }

        /// <summary>
        /// UTC timestamp, round-trip format (<see cref="TunnelProof.FormatTimestamp"/>). Must be within
        /// <see cref="TunnelProtocol.HandshakeSkewSeconds"/> of the server clock.
        /// </summary>
        [JsonPropertyName("timestampUtc")]
        public string TimestampUtc
        {
            get { return _TimestampUtc; }
            set { _TimestampUtc = value ?? String.Empty; }
        }

        /// <summary>
        /// Random nonce (<see cref="TunnelProof.CreateNonce"/>).
        /// </summary>
        [JsonPropertyName("nonce")]
        public string Nonce
        {
            get { return _Nonce; }
            set { _Nonce = value ?? String.Empty; }
        }

        /// <summary>
        /// Sign-out proof (<see cref="TunnelProof.ComputeSignOutProof"/>).
        /// </summary>
        [JsonPropertyName("proof")]
        public string Proof
        {
            get { return _Proof; }
            set { _Proof = value ?? String.Empty; }
        }

        #endregion

        #region Private-Members

        private string _MachineId = String.Empty;
        private string _TimestampUtc = String.Empty;
        private string _Nonce = String.Empty;
        private string _Proof = String.Empty;

        #endregion

        #region Public-Methods

        /// <summary>
        /// Build a signed sign-out request for now.
        /// </summary>
        /// <param name="machineId">Machine identifier.</param>
        /// <param name="machineSecret">Machine secret.</param>
        /// <param name="nowUtc">Current time, UTC.</param>
        /// <returns>Request.</returns>
        /// <exception cref="ArgumentException">The identifier or secret is blank.</exception>
        public static MachineSignOutRequest Create(string machineId, string machineSecret, DateTime nowUtc)
        {
            string timestamp = TunnelProof.FormatTimestamp(nowUtc);
            string nonce = TunnelProof.CreateNonce();
            return new MachineSignOutRequest
            {
                MachineId = machineId,
                TimestampUtc = timestamp,
                Nonce = nonce,
                Proof = TunnelProof.ComputeSignOutProof(machineSecret, machineId, timestamp, nonce)
            };
        }

        #endregion
    }
}
