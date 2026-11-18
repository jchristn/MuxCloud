namespace MuxCloud.Server.Http
{
    using System;
    using System.Collections.Generic;
    using MuxCloud.Core.Settings;

    /// <summary>
    /// Which browser origins may send cookie-authenticated state-changing requests and WebSocket upgrades, and receive
    /// credentialed CORS headers: the public URL's origin plus <see cref="ServerSettings.AdditionalOrigins"/>.
    /// Thread safety: immutable after construction.
    /// </summary>
    public class OriginPolicy
    {
        #region Public-Members

        /// <summary>
        /// Allowed origins (scheme://host[:port], lower case).
        /// </summary>
        public IReadOnlyCollection<string> Allowed
        {
            get { return _Allowed; }
        }

        /// <summary>
        /// Whether the public URL is https (cookies get Secure).
        /// </summary>
        public bool SecureCookies { get; }

        #endregion

        #region Private-Members

        private readonly HashSet<string> _Allowed = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        #endregion

        #region Constructors-and-Factories

        /// <summary>
        /// Instantiate.
        /// </summary>
        /// <param name="settings">Server settings.</param>
        /// <exception cref="ArgumentNullException">settings is null.</exception>
        public OriginPolicy(ServerSettings settings)
        {
            ArgumentNullException.ThrowIfNull(settings);
            string? main = Normalize(settings.PublicUrl);
            if (main != null) _Allowed.Add(main);
            foreach (string extra in settings.AdditionalOrigins)
            {
                string? normalized = Normalize(extra);
                if (normalized != null) _Allowed.Add(normalized);
            }

            SecureCookies = settings.PublicUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase);
        }

        #endregion

        #region Public-Methods

        /// <summary>
        /// Whether an Origin header value is allowed.
        /// </summary>
        /// <param name="origin">Origin header value.</param>
        /// <returns>True when allowed.</returns>
        public bool IsAllowed(string? origin)
        {
            string? normalized = Normalize(origin);
            return normalized != null && _Allowed.Contains(normalized);
        }

        /// <summary>
        /// Normalize a URL or origin to scheme://host[:port].
        /// </summary>
        /// <param name="value">URL or origin.</param>
        /// <returns>Origin, or null when not an absolute http(s) URL.</returns>
        public static string? Normalize(string? value)
        {
            if (String.IsNullOrWhiteSpace(value)) return null;
            if (!Uri.TryCreate(value.Trim(), UriKind.Absolute, out Uri? uri)) return null;
            if (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps) return null;
            return (uri.Scheme + "://" + uri.Host + (uri.IsDefaultPort ? String.Empty : ":" + uri.Port)).ToLowerInvariant();
        }

        #endregion
    }
}
