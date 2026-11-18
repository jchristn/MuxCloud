namespace MuxCloud.Core.Models
{
    using System;
    using MuxCloud.Core.Enums;
    using MuxCloud.Core.Helpers;

    /// <summary>
    /// An account's subscription to a plan.
    /// </summary>
    public class Subscription
    {
        #region Public-Members

        /// <summary>
        /// Subscription identifier (prefix sub_).
        /// </summary>
        public string Id { get; set; } = IdGenerator.NewId(Constants.SubscriptionPrefix);

        /// <summary>
        /// Account.
        /// </summary>
        public string AccountId { get; set; } = String.Empty;

        /// <summary>
        /// Tenant of the account owner.
        /// </summary>
        public string TenantId { get; set; } = String.Empty;

        /// <summary>
        /// Plan.
        /// </summary>
        public string PlanId { get; set; } = String.Empty;

        /// <summary>
        /// Status.
        /// </summary>
        public SubscriptionStatusEnum Status { get; set; } = SubscriptionStatusEnum.Active;

        /// <summary>
        /// Billing provider name.
        /// </summary>
        public string Provider { get; set; } = "none";

        /// <summary>
        /// Customer identifier at the provider.
        /// </summary>
        public string ProviderCustomerId { get; set; } = String.Empty;

        /// <summary>
        /// Subscription identifier at the provider.
        /// </summary>
        public string ProviderSubscriptionId { get; set; } = String.Empty;

        /// <summary>
        /// End of the current period, or null.
        /// </summary>
        public DateTime? CurrentPeriodEndUtc { get; set; } = null;

        /// <summary>
        /// Whether the subscription ends at the period end.
        /// </summary>
        public bool CancelAtPeriodEnd { get; set; } = false;

        /// <summary>
        /// Creation time, UTC.
        /// </summary>
        public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Last update time, UTC.
        /// </summary>
        public DateTime LastUpdateUtc { get; set; } = DateTime.UtcNow;

        #endregion
    }
}
