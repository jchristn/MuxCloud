namespace MuxCloud.Core.Enums
{
    /// <summary>
    /// Subscription status. Trialing, Active, and PastDue grant the plan's features.
    /// </summary>
    public enum SubscriptionStatusEnum
    {
        /// <summary>
        /// In a trial period.
        /// </summary>
        Trialing = 0,

        /// <summary>
        /// Paid and current.
        /// </summary>
        Active = 1,

        /// <summary>
        /// Payment failed; still granted during the grace period.
        /// </summary>
        PastDue = 2,

        /// <summary>
        /// Canceled; no longer granted.
        /// </summary>
        Canceled = 3,

        /// <summary>
        /// Ended; no longer granted.
        /// </summary>
        Expired = 4
    }
}
