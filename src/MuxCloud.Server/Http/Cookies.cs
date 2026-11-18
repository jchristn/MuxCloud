namespace MuxCloud.Server.Http
{
    using System;
    using System.Collections.Generic;
    using MuxCloud.Core;

    /// <summary>
    /// Builds and parses the session and refresh cookies. Both are HttpOnly and SameSite=Strict, and Secure when the public
    /// URL is https.
    /// Thread safety: stateless.
    /// </summary>
    public static class Cookies
    {
        #region Public-Methods

        /// <summary>
        /// Session cookie header value.
        /// </summary>
        /// <param name="accessToken">Access token.</param>
        /// <param name="maxAgeSeconds">Lifetime.</param>
        /// <param name="secure">Add Secure.</param>
        /// <returns>Set-Cookie value.</returns>
        public static string Session(string accessToken, int maxAgeSeconds, bool secure)
        {
            return Build(Constants.SessionCookieName, accessToken, "/", maxAgeSeconds, secure);
        }

        /// <summary>
        /// Refresh cookie header value (sent only to the auth routes).
        /// </summary>
        /// <param name="refreshToken">Refresh token.</param>
        /// <param name="maxAgeSeconds">Lifetime.</param>
        /// <param name="secure">Add Secure.</param>
        /// <returns>Set-Cookie value.</returns>
        public static string Refresh(string refreshToken, int maxAgeSeconds, bool secure)
        {
            return Build(Constants.RefreshCookieName, refreshToken, "/v1.0/api/auth", maxAgeSeconds, secure);
        }

        /// <summary>
        /// Cookie values that clear both cookies.
        /// </summary>
        /// <param name="secure">Add Secure.</param>
        /// <returns>Set-Cookie values.</returns>
        public static List<string> Clear(bool secure)
        {
            return new List<string>
            {
                Build(Constants.SessionCookieName, String.Empty, "/", 0, secure),
                Build(Constants.RefreshCookieName, String.Empty, "/v1.0/api/auth", 0, secure)
            };
        }

        /// <summary>
        /// Read a cookie from a Cookie header.
        /// </summary>
        /// <param name="header">Cookie header value.</param>
        /// <param name="name">Cookie name.</param>
        /// <returns>Value, or null.</returns>
        public static string? Read(string? header, string name)
        {
            if (String.IsNullOrEmpty(header)) return null;
            foreach (string part in header.Split(';'))
            {
                int eq = part.IndexOf('=', StringComparison.Ordinal);
                if (eq <= 0) continue;
                if (String.Equals(part.Substring(0, eq).Trim(), name, StringComparison.Ordinal))
                {
                    string value = part.Substring(eq + 1).Trim();
                    return value.Length == 0 ? null : value;
                }
            }

            return null;
        }

        #endregion

        #region Private-Methods

        private static string Build(string name, string value, string path, int maxAgeSeconds, bool secure)
        {
            return name + "=" + value + "; Path=" + path + "; Max-Age=" + Math.Max(0, maxAgeSeconds) + "; HttpOnly; SameSite=Strict" + (secure ? "; Secure" : String.Empty);
        }

        #endregion
    }
}
