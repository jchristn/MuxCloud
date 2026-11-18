namespace MuxCloud.Core.Database.Interfaces
{
    using System;
    using System.Collections.Generic;
    using System.Threading;
    using System.Threading.Tasks;
    using MuxCloud.Core.Models;

    /// <summary>
    /// Plan data access. Plans are a global catalog.
    /// </summary>
    public interface IPlanMethods
    {
        /// <summary>
        /// Create a plan and its features.
        /// </summary>
        /// <param name="plan">Plan with its features.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Created plan.</returns>
        Task<Plan> CreateAsync(Plan plan, CancellationToken token = default);

        /// <summary>
        /// Read a plan with its features.
        /// </summary>
        /// <param name="id">Plan identifier.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Plan, or null.</returns>
        Task<Plan?> ReadAsync(string id, CancellationToken token = default);

        /// <summary>
        /// Read a plan by code with its features.
        /// </summary>
        /// <param name="code">Plan code.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Plan, or null.</returns>
        Task<Plan?> ReadByCodeAsync(string code, CancellationToken token = default);

        /// <summary>
        /// Update a plan and replace its features.
        /// </summary>
        /// <param name="plan">Plan with changes, whose features replace the stored ones.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Updated plan.</returns>
        Task<Plan> UpdateAsync(Plan plan, CancellationToken token = default);

        /// <summary>
        /// Enumerate plans with their features, by price.
        /// </summary>
        /// <param name="includeInactive">Whether to include inactive and private plans.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Plans.</returns>
        Task<List<Plan>> EnumerateAsync(bool includeInactive, CancellationToken token = default);
    }
}
