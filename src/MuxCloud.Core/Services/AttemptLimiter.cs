namespace MuxCloud.Core.Services
{
    using System;
    using System.Collections.Concurrent;
    using System.Collections.Generic;
    using System.Linq;

    /// <summary>
    /// Sliding-window attempt counter with lockout, keyed by strings such as "email:ada@example.com" or "ip:203.0.113.7".
    /// In memory, per server node.
    /// Thread safety: safe to call concurrently.
    /// </summary>
    public class AttemptLimiter
    {
        #region Public-Members

        /// <summary>
        /// Attempts allowed within the window before a lockout. Minimum 1.
        /// </summary>
        public int MaxAttempts { get; }

        /// <summary>
        /// Window length.
        /// </summary>
        public TimeSpan Window { get; }

        /// <summary>
        /// Lockout length.
        /// </summary>
        public TimeSpan Lockout { get; }

        #endregion

        #region Private-Members

        private readonly ConcurrentDictionary<string, AttemptState> _States = new ConcurrentDictionary<string, AttemptState>(StringComparer.Ordinal);

        #endregion

        #region Constructors-and-Factories

        /// <summary>
        /// Instantiate.
        /// </summary>
        /// <param name="maxAttempts">Attempts allowed within the window. Minimum 1.</param>
        /// <param name="window">Window length.</param>
        /// <param name="lockout">Lockout length.</param>
        public AttemptLimiter(int maxAttempts, TimeSpan window, TimeSpan lockout)
        {
            MaxAttempts = Math.Max(1, maxAttempts);
            Window = window <= TimeSpan.Zero ? TimeSpan.FromMinutes(15) : window;
            Lockout = lockout <= TimeSpan.Zero ? TimeSpan.FromMinutes(15) : lockout;
        }

        #endregion

        #region Public-Methods

        /// <summary>
        /// Whether a key is locked out.
        /// </summary>
        /// <param name="key">Key.</param>
        /// <param name="retryAfterSeconds">Seconds until the lockout ends, or 0.</param>
        /// <returns>True when locked.</returns>
        public bool IsLocked(string key, out int retryAfterSeconds)
        {
            retryAfterSeconds = 0;
            if (!_States.TryGetValue(key, out AttemptState? state)) return false;
            lock (state)
            {
                DateTime now = DateTime.UtcNow;
                if (state.LockedUntilUtc.HasValue && state.LockedUntilUtc.Value > now)
                {
                    retryAfterSeconds = (int)Math.Ceiling((state.LockedUntilUtc.Value - now).TotalSeconds);
                    return true;
                }

                return false;
            }
        }

        /// <summary>
        /// Record a failed attempt; locks the key once the window holds <see cref="MaxAttempts"/> failures.
        /// </summary>
        /// <param name="key">Key.</param>
        public void RecordFailure(string key)
        {
            Prune();
            AttemptState state = _States.GetOrAdd(key, (string k) => new AttemptState());
            lock (state)
            {
                DateTime now = DateTime.UtcNow;
                state.Attempts.RemoveAll((DateTime t) => now - t > Window);
                state.Attempts.Add(now);
                if (state.Attempts.Count >= MaxAttempts)
                {
                    state.LockedUntilUtc = now + Lockout;
                    state.Attempts.Clear();
                }
            }
        }

        /// <summary>
        /// Consume one attempt of a rate limit. Returns false, without consuming, when the key is locked; the attempt that reaches
        /// the limit is allowed and locks the key for later attempts.
        /// </summary>
        /// <param name="key">Key.</param>
        /// <param name="retryAfterSeconds">Seconds until an attempt is available, or 0.</param>
        /// <returns>True when allowed.</returns>
        public bool TryConsume(string key, out int retryAfterSeconds)
        {
            if (IsLocked(key, out retryAfterSeconds)) return false;
            RecordFailure(key);
            return true;
        }

        /// <summary>
        /// Clear a key after a success.
        /// </summary>
        /// <param name="key">Key.</param>
        public void Reset(string key)
        {
            _States.TryRemove(key, out _);
        }

        #endregion

        #region Private-Methods

        private void Prune()
        {
            if (_States.Count < 10000) return;
            DateTime now = DateTime.UtcNow;
            List<string> stale = _States.Where(pair => (!pair.Value.LockedUntilUtc.HasValue || pair.Value.LockedUntilUtc.Value < now) && pair.Value.Attempts.All(t => now - t > Window)).Select(pair => pair.Key).ToList();
            foreach (string key in stale) _States.TryRemove(key, out _);
        }

        #endregion
    }
}
