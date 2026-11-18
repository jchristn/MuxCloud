namespace MuxCloud.Core.Security
{
    using System;
    using System.Security.Cryptography;
    using System.Text;

    /// <summary>
    /// PBKDF2-SHA256 password hashing with a per-user salt. This is a recorded departure from the plain SHA-256 in
    /// AUTHENTICATION.md: a public service needs a slow, salted hash.
    /// Thread safety: stateless; safe to call concurrently.
    /// </summary>
    public class PasswordHasher
    {
        #region Public-Members

        /// <summary>
        /// Iterations used for new hashes. Default 600000, minimum 1000, maximum 10000000.
        /// </summary>
        public int Iterations
        {
            get { return _Iterations; }
            init { _Iterations = Math.Clamp(value, 1000, 10000000); }
        }

        #endregion

        #region Private-Members

        private const int _SaltBytes = 16;
        private const int _HashBytes = 32;
        private int _Iterations = 600000;

        #endregion

        #region Public-Methods

        /// <summary>
        /// Hash a password with a new salt.
        /// </summary>
        /// <param name="password">Password.</param>
        /// <param name="hash">Base64 hash.</param>
        /// <param name="salt">Base64 salt.</param>
        /// <exception cref="ArgumentNullException">password is null.</exception>
        public void Hash(string password, out string hash, out string salt)
        {
            ArgumentNullException.ThrowIfNull(password);
            byte[] saltBytes = RandomNumberGenerator.GetBytes(_SaltBytes);
            byte[] hashBytes = Rfc2898DeriveBytes.Pbkdf2(Encoding.UTF8.GetBytes(password), saltBytes, Iterations, HashAlgorithmName.SHA256, _HashBytes);
            hash = Convert.ToBase64String(hashBytes);
            salt = Convert.ToBase64String(saltBytes);
        }

        /// <summary>
        /// Verify a password against a stored hash in constant time.
        /// </summary>
        /// <param name="password">Password to check.</param>
        /// <param name="hash">Stored base64 hash.</param>
        /// <param name="salt">Stored base64 salt.</param>
        /// <param name="iterations">Stored iteration count.</param>
        /// <returns>True when the password matches.</returns>
        public static bool Verify(string? password, string hash, string salt, int iterations)
        {
            if (String.IsNullOrEmpty(password) || String.IsNullOrEmpty(hash) || String.IsNullOrEmpty(salt) || iterations < 1) return false;
            byte[] expected;
            byte[] saltBytes;
            try
            {
                expected = Convert.FromBase64String(hash);
                saltBytes = Convert.FromBase64String(salt);
            }
            catch (FormatException)
            {
                return false;
            }

            byte[] actual = Rfc2898DeriveBytes.Pbkdf2(Encoding.UTF8.GetBytes(password), saltBytes, iterations, HashAlgorithmName.SHA256, expected.Length);
            return CryptographicOperations.FixedTimeEquals(actual, expected);
        }

        #endregion
    }
}
