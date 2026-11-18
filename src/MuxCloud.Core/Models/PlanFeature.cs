namespace MuxCloud.Core.Models
{
    using System;
    using MuxCloud.Core.Helpers;

    /// <summary>
    /// A feature granted by a plan. A null limit means enabled and unlimited, 0 means disabled, and a positive value is a cap.
    /// </summary>
    public class PlanFeature
    {
        #region Public-Members

        /// <summary>
        /// Plan feature identifier (prefix pfe_).
        /// </summary>
        public string Id { get; set; } = IdGenerator.NewId(Constants.PlanFeaturePrefix);

        /// <summary>
        /// Plan.
        /// </summary>
        public string PlanId { get; set; } = String.Empty;

        /// <summary>
        /// Feature key, for example machines.max.
        /// </summary>
        public string FeatureKey { get; set; } = String.Empty;

        /// <summary>
        /// Limit; null is unlimited, 0 is disabled.
        /// </summary>
        public long? LimitValue { get; set; } = null;

        #endregion
    }
}
