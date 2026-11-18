namespace MuxCloud.Core.Security
{
    using System;
    using System.Security.Cryptography;
    using System.Text;

    /// <summary>
    /// SHA-256 hashing and random token creation for high-entropy secrets (refresh tokens, one-time tokens). High-entropy
    /// values do not need a slow hash.
    /// Thread safety: stateless.
    /// </summary>
    public static class SecretHash
    {
        #region Private-Members

        private const string _Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        #endregion

        #region Public-Methods

        /// <summary>
        /// Lowercase hex SHA-256 of a value.
        /// </summary>
        /// <param name="value">Value; null hashes as empty.</param>
        /// <returns>Hash.</returns>
        public static string Sha256Hex(string? value)
        {
            return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value ?? String.Empty))).ToLowerInvariant();
        }

        /// <summary>
        /// Create a random token: the prefix plus random alphanumeric characters.
        /// </summary>
        /// <param name="prefix">Prefix.</param>
        /// <param name="length">Random characters. Default 43 (about 256 bits). Minimum 16, maximum 256.</param>
        /// <returns>Token.</returns>
        public static string CreateToken(string prefix, int length = 43)
        {
            return (prefix ?? String.Empty) + RandomNumberGenerator.GetString(_Alphabet, Math.Clamp(length, 16, 256));
        }

        /// <summary>
        /// Constant-time string comparison.
        /// </summary>
        /// <param name="a">First value.</param>
        /// <param name="b">Second value.</param>
        /// <returns>True when equal.</returns>
        public static bool FixedTimeEquals(string? a, string? b)
        {
            if (a == null || b == null) return false;
            return CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(a), Encoding.UTF8.GetBytes(b));
        }

        #endregion
    }
}
