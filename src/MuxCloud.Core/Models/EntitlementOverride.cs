namespace MuxCloud.Core.Models
{
    using System;
    using MuxCloud.Core.Helpers;

    /// <summary>
    /// An administrator grant or restriction of one feature for one account.
    /// </summary>
    public class EntitlementOverride
    {
        #region Public-Members

        /// <summary>
        /// Override identifier (prefix eno_).
        /// </summary>
        public string Id { get; set; } = IdGenerator.NewId(Constants.EntitlementOverridePrefix);

        /// <summary>
        /// Account.
        /// </summary>
        public string AccountId { get; set; } = String.Empty;

        /// <summary>
        /// Feature key.
        /// </summary>
        public string FeatureKey { get; set; } = String.Empty;

        /// <summary>
        /// Limit; null is unlimited, 0 is disabled.
        /// </summary>
        public long? LimitValue { get; set; } = null;

        /// <summary>
        /// Why the override exists.
        /// </summary>
        public string Reason { get; set; } = String.Empty;

        /// <summary>
        /// When the override stops applying, or null.
        /// </summary>
        public DateTime? ExpiresUtc { get; set; } = null;

        /// <summary>
        /// Creation time, UTC.
        /// </summary>
        public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;

        #endregion
    }
}
