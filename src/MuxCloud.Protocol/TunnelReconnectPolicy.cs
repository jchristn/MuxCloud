namespace MuxCloud.Protocol
{
    using System;

    /// <summary>
    /// Exponential reconnect backoff with jitter: <c>base * 2^(attempt-1)</c>, capped at the maximum, then scaled by a random
    /// factor in [1 - jitter, 1 + jitter].
    /// Thread safety: instances are immutable; <see cref="ComputeDelay(int, Random)"/> is safe to call concurrently when the
    /// supplied <see cref="Random"/> is (for example <see cref="Random.Shared"/>).
    /// </summary>
    public class TunnelReconnectPolicy
    {
        #region Public-Members

        /// <summary>
        /// Delay before the first retry, in seconds. Default 2, minimum 1, maximum 300.
        /// </summary>
        public int BaseDelaySeconds
        {
            get { return _BaseDelaySeconds; }
            init { _BaseDelaySeconds = Math.Clamp(value, 1, 300); }
        }

        /// <summary>
        /// Largest delay, in seconds. Default 60, minimum 1, maximum 3600.
        /// </summary>
        public int MaxDelaySeconds
        {
            get { return _MaxDelaySeconds; }
            init { _MaxDelaySeconds = Math.Clamp(value, 1, 3600); }
        }

        /// <summary>
        /// Jitter fraction. Default 0.2 (plus or minus 20 percent), minimum 0, maximum 0.5.
        /// </summary>
        public double Jitter
        {
            get { return _Jitter; }
            init { _Jitter = Math.Clamp(value, 0.0, 0.5); }
        }

        #endregion

        #region Private-Members

        private int _BaseDelaySeconds = 2;
        private int _MaxDelaySeconds = 60;
        private double _Jitter = 0.2;

        #endregion

        #region Public-Methods

        /// <summary>
        /// Delay before a retry.
        /// </summary>
        /// <param name="attempt">1-based attempt number; values below 1 are treated as 1.</param>
        /// <param name="random">Randomness source.</param>
        /// <returns>Delay.</returns>
        /// <exception cref="ArgumentNullException">random is null.</exception>
        public TimeSpan ComputeDelay(int attempt, Random random)
        {
            ArgumentNullException.ThrowIfNull(random);
            int exponent = Math.Clamp(attempt, 1, 20) - 1;
            double seconds = Math.Min(MaxDelaySeconds, BaseDelaySeconds * Math.Pow(2, exponent));
            double factor = 1.0 + ((random.NextDouble() * 2.0) - 1.0) * Jitter;
            return TimeSpan.FromSeconds(Math.Max(0.5, seconds * factor));
        }

        #endregion
    }
}
