namespace MuxCloud.Core.Security
{
    using System;
    using System.Security.Cryptography;
    using System.Text;
    using System.Text.Json;
    using MuxCloud.Core.Models;

    /// <summary>
    /// AES-256-GCM encryption for access tokens and machine secrets. Each value gets a random 96-bit nonce, which is prepended
    /// to the ciphertext and tag. Separate keys for tokens and secrets are derived from the signing key with HKDF-SHA256.
    /// Thread safety: safe to call concurrently.
    /// </summary>
    public class TokenProtector
    {
        #region Private-Members

        private const int _NonceBytes = 12;
        private const int _TagBytes = 16;
        private readonly byte[] _TokenKey;
        private readonly byte[] _SecretKey;

        #endregion

        #region Constructors-and-Factories

        /// <summary>
        /// Instantiate.
        /// </summary>
        /// <param name="signingKey">Signing key, at least 32 characters.</param>
        /// <exception cref="ArgumentException">The key is shorter than 32 characters.</exception>
        public TokenProtector(string signingKey)
        {
            if (String.IsNullOrWhiteSpace(signingKey) || signingKey.Length < 32) throw new ArgumentException("Auth.SigningKey must be at least 32 characters.", nameof(signingKey));
            byte[] ikm = Encoding.UTF8.GetBytes(signingKey);
            _TokenKey = HKDF.DeriveKey(HashAlgorithmName.SHA256, ikm, 32, Encoding.UTF8.GetBytes("muxcloud"), Encoding.UTF8.GetBytes("access-token"));
            _SecretKey = HKDF.DeriveKey(HashAlgorithmName.SHA256, ikm, 32, Encoding.UTF8.GetBytes("muxcloud"), Encoding.UTF8.GetBytes("machine-secret"));
        }

        #endregion

        #region Public-Methods

        /// <summary>
        /// Encrypt an access token payload.
        /// </summary>
        /// <param name="payload">Payload.</param>
        /// <returns>Token: prefix plus base64url ciphertext.</returns>
        /// <exception cref="ArgumentNullException">payload is null.</exception>
        public string ProtectAccessToken(AccessTokenPayload payload)
        {
            ArgumentNullException.ThrowIfNull(payload);
            byte[] plain = JsonSerializer.SerializeToUtf8Bytes(payload);
            return Constants.AccessTokenPrefix + Base64UrlEncode(Encrypt(_TokenKey, plain));
        }

        /// <summary>
        /// Decrypt an access token. Expiry is not checked here.
        /// </summary>
        /// <param name="token">Token.</param>
        /// <returns>Payload, or null when the token is malformed or was not issued with this key.</returns>
        public AccessTokenPayload? UnprotectAccessToken(string? token)
        {
            if (String.IsNullOrWhiteSpace(token) || !token.StartsWith(Constants.AccessTokenPrefix, StringComparison.Ordinal)) return null;
            byte[]? data = Base64UrlDecode(token.Substring(Constants.AccessTokenPrefix.Length));
            if (data == null) return null;
            byte[]? plain = Decrypt(_TokenKey, data);
            if (plain == null) return null;
            try
            {
                return JsonSerializer.Deserialize<AccessTokenPayload>(plain);
            }
            catch (JsonException)
            {
                return null;
            }
        }

        /// <summary>
        /// Encrypt a machine secret for storage.
        /// </summary>
        /// <param name="secret">Secret.</param>
        /// <returns>Base64 ciphertext.</returns>
        /// <exception cref="ArgumentException">secret is blank.</exception>
        public string EncryptSecret(string secret)
        {
            if (String.IsNullOrEmpty(secret)) throw new ArgumentException("A secret is required.", nameof(secret));
            return Convert.ToBase64String(Encrypt(_SecretKey, Encoding.UTF8.GetBytes(secret)));
        }

        /// <summary>
        /// Decrypt a stored machine secret.
        /// </summary>
        /// <param name="encrypted">Base64 ciphertext.</param>
        /// <returns>Secret, or null when it cannot be decrypted (for example after a signing key change).</returns>
        public string? DecryptSecret(string? encrypted)
        {
            if (String.IsNullOrEmpty(encrypted)) return null;
            byte[] data;
            try
            {
                data = Convert.FromBase64String(encrypted);
            }
            catch (FormatException)
            {
                return null;
            }

            byte[]? plain = Decrypt(_SecretKey, data);
            return plain == null ? null : Encoding.UTF8.GetString(plain);
        }

        #endregion

        #region Private-Methods

        private static byte[] Encrypt(byte[] key, byte[] plain)
        {
            byte[] nonce = RandomNumberGenerator.GetBytes(_NonceBytes);
            byte[] cipher = new byte[plain.Length];
            byte[] tag = new byte[_TagBytes];
            using (AesGcm aes = new AesGcm(key, _TagBytes))
            {
                aes.Encrypt(nonce, plain, cipher, tag);
            }

            byte[] output = new byte[_NonceBytes + cipher.Length + _TagBytes];
            Buffer.BlockCopy(nonce, 0, output, 0, _NonceBytes);
            Buffer.BlockCopy(cipher, 0, output, _NonceBytes, cipher.Length);
            Buffer.BlockCopy(tag, 0, output, _NonceBytes + cipher.Length, _TagBytes);
            return output;
        }

        private static byte[]? Decrypt(byte[] key, byte[] data)
        {
            if (data.Length < _NonceBytes + _TagBytes) return null;
            int cipherLength = data.Length - _NonceBytes - _TagBytes;
            byte[] nonce = new byte[_NonceBytes];
            byte[] cipher = new byte[cipherLength];
            byte[] tag = new byte[_TagBytes];
            Buffer.BlockCopy(data, 0, nonce, 0, _NonceBytes);
            Buffer.BlockCopy(data, _NonceBytes, cipher, 0, cipherLength);
            Buffer.BlockCopy(data, _NonceBytes + cipherLength, tag, 0, _TagBytes);
            byte[] plain = new byte[cipherLength];
            try
            {
                using (AesGcm aes = new AesGcm(key, _TagBytes))
                {
                    aes.Decrypt(nonce, cipher, tag, plain);
                }

                return plain;
            }
            catch (CryptographicException)
            {
                return null;
            }
        }

        private static string Base64UrlEncode(byte[] data)
        {
            return Convert.ToBase64String(data).TrimEnd('=').Replace('+', '-').Replace('/', '_');
        }

        private static byte[]? Base64UrlDecode(string text)
        {
            string s = text.Replace('-', '+').Replace('_', '/');
            switch (s.Length % 4)
            {
                case 2: s += "=="; break;
                case 3: s += "="; break;
                case 1: return null;
            }

            try
            {
                return Convert.FromBase64String(s);
            }
            catch (FormatException)
            {
                return null;
            }
        }

        #endregion
    }
}
