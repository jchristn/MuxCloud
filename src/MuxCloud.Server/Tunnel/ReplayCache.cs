namespace MuxCloud.Server.Tunnel
{
    using System;
    using System.Collections.Concurrent;
    using System.Collections.Generic;
    using System.Linq;

    /// <summary>
    /// Remembers handshake nonces so a captured hello cannot be replayed within the window.
    /// Thread safety: safe to call concurrently.
    /// </summary>
    public class ReplayCache
    {
        #region Public-Members

        /// <summary>
        /// How long a nonce is remembered. Default 5 minutes.
        /// </summary>
        public TimeSpan Window { get; init; } = TimeSpan.FromMinutes(5);

        #endregion

        #region Private-Members

        private readonly ConcurrentDictionary<string, DateTime> _Seen = new ConcurrentDictionary<string, DateTime>(StringComparer.Ordinal);

        #endregion

        #region Public-Methods

        /// <summary>
        /// Record a nonce.
        /// </summary>
        /// <param name="key">Machine and nonce.</param>
        /// <returns>True the first time; false for a replay.</returns>
        public bool TryAdd(string key)
        {
            DateTime now = DateTime.UtcNow;
            if (_Seen.Count > 10000)
            {
                List<string> stale = _Seen.Where(pair => now - pair.Value > Window).Select(pair => pair.Key).ToList();
                foreach (string k in stale) _Seen.TryRemove(k, out _);
            }

            if (_Seen.TryGetValue(key, out DateTime when) && now - when <= Window) return false;
            _Seen[key] = now;
            return true;
        }

        #endregion
    }
}
