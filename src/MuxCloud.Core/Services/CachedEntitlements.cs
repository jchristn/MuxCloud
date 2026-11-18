namespace MuxCloud.Core.Services
{
    using System;
    using MuxCloud.Core.Models;

    /// <summary>
    /// A cached entitlement computation.
    /// </summary>
    public class CachedEntitlements
    {
        #region Public-Members

        /// <summary>
        /// Value.
        /// </summary>
        public EffectiveEntitlements Value { get; set; } = new EffectiveEntitlements();

        /// <summary>
        /// When the value stops being used.
        /// </summary>
        public DateTime ExpiresUtc { get; set; } = DateTime.UtcNow;

        #endregion
    }
}
