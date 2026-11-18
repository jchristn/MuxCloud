namespace MuxCloud.Core.Database.Interfaces
{
    using System;
    using System.Collections.Generic;
    using System.Threading;
    using System.Threading.Tasks;
    using MuxCloud.Core.Models;

    /// <summary>
    /// Push device data access. Devices are scoped to a tenant and user.
    /// </summary>
    public interface IDeviceMethods
    {
        /// <summary>
        /// Register a device.
        /// </summary>
        /// <param name="device">Device to register.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Created device.</returns>
        Task<Device> CreateAsync(Device device, CancellationToken token = default);

        /// <summary>
        /// Read a device within a tenant.
        /// </summary>
        /// <param name="tenantId">Tenant identifier.</param>
        /// <param name="id">Device identifier.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Device, or null.</returns>
        Task<Device?> ReadAsync(string tenantId, string id, CancellationToken token = default);

        /// <summary>
        /// Read a user's device by push token.
        /// </summary>
        /// <param name="tenantId">Tenant identifier.</param>
        /// <param name="userId">User identifier.</param>
        /// <param name="expoPushToken">Expo push token.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Device, or null.</returns>
        Task<Device?> ReadByTokenAsync(string tenantId, string userId, string expoPushToken, CancellationToken token = default);

        /// <summary>
        /// Update a device.
        /// </summary>
        /// <param name="device">Device with changes.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Updated device.</returns>
        Task<Device> UpdateAsync(Device device, CancellationToken token = default);

        /// <summary>
        /// Every device of a user, newest first.
        /// </summary>
        /// <param name="tenantId">Tenant identifier.</param>
        /// <param name="userId">User identifier.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Devices.</returns>
        Task<List<Device>> ListForUserAsync(string tenantId, string userId, CancellationToken token = default);

        /// <summary>
        /// Delete a device.
        /// </summary>
        /// <param name="tenantId">Tenant identifier.</param>
        /// <param name="id">Device identifier.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>True if one was deleted.</returns>
        Task<bool> DeleteAsync(string tenantId, string id, CancellationToken token = default);

        /// <summary>
        /// Delete every device of a user.
        /// </summary>
        /// <param name="tenantId">Tenant identifier.</param>
        /// <param name="userId">User identifier.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Task.</returns>
        Task DeleteForUserAsync(string tenantId, string userId, CancellationToken token = default);

        /// <summary>
        /// Delete every device with a push token (the provider reported it unregistered).
        /// </summary>
        /// <param name="expoPushToken">Expo push token.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Devices deleted.</returns>
        Task<int> DeleteByTokenAsync(string expoPushToken, CancellationToken token = default);
    }
}
