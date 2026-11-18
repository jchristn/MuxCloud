namespace MuxCloud.Protocol
{
    using System;
    using System.Globalization;
    using System.Security.Cryptography;
    using System.Text;

    /// <summary>
    /// Handshake proof helpers. The machine proves it holds its machine secret without sending it:
    /// <c>proof = hex(HMAC-SHA256(key: UTF8(machineSecret), message: UTF8("mux-tunnel:" + machineId + ":" + timestampUtc + ":" + nonce)))</c>.
    /// Thread safety: stateless; safe to call concurrently.
    /// </summary>
    public static class TunnelProof
    {
        #region Public-Members

        /// <summary>
        /// Prefix of machine secrets.
        /// </summary>
        public const string MachineSecretPrefix = "mcs_";

        /// <summary>
        /// Number of random characters after <see cref="MachineSecretPrefix"/>.
        /// </summary>
        public const int MachineSecretRandomLength = 48;

        #endregion

        #region Private-Members

        private const string _Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        #endregion

        #region Public-Methods

        /// <summary>
        /// Create a random 16-byte nonce as lowercase hex.
        /// </summary>
        /// <returns>Nonce (32 characters).</returns>
        public static string CreateNonce()
        {
            return Convert.ToHexString(RandomNumberGenerator.GetBytes(16)).ToLowerInvariant();
        }

        /// <summary>
        /// Create a machine secret: <see cref="MachineSecretPrefix"/> plus <see cref="MachineSecretRandomLength"/> random
        /// alphanumeric characters (about 285 bits of entropy).
        /// </summary>
        /// <returns>Secret.</returns>
        public static string CreateMachineSecret()
        {
            return MachineSecretPrefix + RandomNumberGenerator.GetString(_Alphabet, MachineSecretRandomLength);
        }

        /// <summary>
        /// Format a timestamp for the handshake: round-trip ("O") format in UTC.
        /// </summary>
        /// <param name="utc">Time; converted to UTC.</param>
        /// <returns>Formatted timestamp.</returns>
        public static string FormatTimestamp(DateTime utc)
        {
            return utc.ToUniversalTime().ToString("O", CultureInfo.InvariantCulture);
        }

        /// <summary>
        /// Compute the handshake proof.
        /// </summary>
        /// <param name="machineSecret">Machine secret.</param>
        /// <param name="machineId">Machine identifier.</param>
        /// <param name="timestampUtc">Timestamp string exactly as sent.</param>
        /// <param name="nonce">Nonce exactly as sent.</param>
        /// <returns>Lowercase hex HMAC-SHA256.</returns>
        /// <exception cref="ArgumentException">Any argument is blank.</exception>
        public static string ComputeProof(string machineSecret, string machineId, string timestampUtc, string nonce)
        {
            if (String.IsNullOrWhiteSpace(machineSecret)) throw new ArgumentException("A machine secret is required to compute a proof.", nameof(machineSecret));
            if (String.IsNullOrWhiteSpace(machineId)) throw new ArgumentException("A machine identifier is required to compute a proof.", nameof(machineId));
            if (String.IsNullOrWhiteSpace(timestampUtc)) throw new ArgumentException("A timestamp is required to compute a proof.", nameof(timestampUtc));
            if (String.IsNullOrWhiteSpace(nonce)) throw new ArgumentException("A nonce is required to compute a proof.", nameof(nonce));
            byte[] key = Encoding.UTF8.GetBytes(machineSecret);
            byte[] message = Encoding.UTF8.GetBytes("mux-tunnel:" + machineId + ":" + timestampUtc + ":" + nonce);
            return Convert.ToHexString(HMACSHA256.HashData(key, message)).ToLowerInvariant();
        }

        /// <summary>
        /// Verify a handshake proof in constant time.
        /// </summary>
        /// <param name="machineSecret">Machine secret held by the server.</param>
        /// <param name="machineId">Machine identifier.</param>
        /// <param name="timestampUtc">Timestamp string as received.</param>
        /// <param name="nonce">Nonce as received.</param>
        /// <param name="proof">Proof as received.</param>
        /// <returns>True when the proof matches.</returns>
        public static bool VerifyProof(string machineSecret, string machineId, string timestampUtc, string nonce, string proof)
        {
            if (String.IsNullOrWhiteSpace(machineSecret) || String.IsNullOrWhiteSpace(machineId) || String.IsNullOrWhiteSpace(timestampUtc)
                || String.IsNullOrWhiteSpace(nonce) || String.IsNullOrWhiteSpace(proof)) return false;
            string expected = ComputeProof(machineSecret, machineId, timestampUtc, nonce);
            byte[] a = Encoding.ASCII.GetBytes(expected);
            byte[] b = Encoding.ASCII.GetBytes(proof.Trim().ToLowerInvariant());
            return CryptographicOperations.FixedTimeEquals(a, b);
        }

        /// <summary>
        /// Whether a handshake timestamp parses and falls within the allowed skew of now.
        /// </summary>
        /// <param name="timestampUtc">Timestamp string as received.</param>
        /// <param name="nowUtc">Current time, UTC.</param>
        /// <param name="skewSeconds">Allowed skew in seconds. Default <see cref="TunnelProtocol.HandshakeSkewSeconds"/>; minimum 1.</param>
        /// <returns>True when fresh.</returns>
        public static bool IsTimestampFresh(string timestampUtc, DateTime nowUtc, int skewSeconds = TunnelProtocol.HandshakeSkewSeconds)
        {
            if (String.IsNullOrWhiteSpace(timestampUtc)) return false;
            if (!DateTime.TryParse(timestampUtc, CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal, out DateTime parsed)) return false;
            double delta = Math.Abs((nowUtc.ToUniversalTime() - parsed).TotalSeconds);
            return delta <= Math.Max(1, skewSeconds);
        }

        /// <summary>
        /// Last four characters of a secret, for display.
        /// </summary>
        /// <param name="secret">Secret; null or short values return what is there.</param>
        /// <returns>Last four characters.</returns>
        public static string Last4(string? secret)
        {
            if (String.IsNullOrEmpty(secret)) return String.Empty;
            return secret.Length <= 4 ? secret : secret.Substring(secret.Length - 4);
        }

        #endregion
    }
}
