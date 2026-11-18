namespace MuxCloud.Core.Models
{
    using System;
    using System.Collections.Generic;
    using MuxCloud.Core.Helpers;

    /// <summary>
    /// A billing plan. Plans are global (shared catalog), so they carry no tenant.
    /// </summary>
    public class Plan
    {
        #region Public-Members

        /// <summary>
        /// Plan identifier (prefix pln_).
        /// </summary>
        public string Id { get; set; } = IdGenerator.NewId(Constants.PlanPrefix);

        /// <summary>
        /// Stable code, unique, for example free.
        /// </summary>
        public string Code { get; set; } = String.Empty;

        /// <summary>
        /// Display name.
        /// </summary>
        public string Name { get; set; } = String.Empty;

        /// <summary>
        /// Price in the smallest currency unit.
        /// </summary>
        public long PriceCents { get; set; } = 0;

        /// <summary>
        /// ISO currency code, lower case.
        /// </summary>
        public string Currency { get; set; } = "usd";

        /// <summary>
        /// Billing interval: month or year.
        /// </summary>
        public string BillingInterval { get; set; } = "month";

        /// <summary>
        /// Whether the plan can be subscribed to.
        /// </summary>
        public bool Active { get; set; } = true;

        /// <summary>
        /// Whether the plan is listed publicly.
        /// </summary>
        public bool IsPublic { get; set; } = true;

        /// <summary>
        /// Features the plan grants.
        /// </summary>
        public List<PlanFeature> Features { get; set; } = new List<PlanFeature>();

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
