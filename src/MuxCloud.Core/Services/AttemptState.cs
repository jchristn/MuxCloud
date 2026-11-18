namespace MuxCloud.Core.Services
{
    using System;
    using System.Collections.Generic;

    /// <summary>
    /// Attempts recorded for one key by <see cref="AttemptLimiter"/>.
    /// Thread safety: callers lock the instance.
    /// </summary>
    public class AttemptState
    {
        #region Public-Members

        /// <summary>
        /// Attempt times within the window.
        /// </summary>
        public List<DateTime> Attempts { get; } = new List<DateTime>();

        /// <summary>
        /// Locked until this time, or null.
        /// </summary>
        public DateTime? LockedUntilUtc { get; set; } = null;

        #endregion
    }
}
