namespace MuxCloud.Core.Database.Implementations
{
    using System;
    using System.Collections.Generic;
    using System.Threading;
    using System.Threading.Tasks;
    using MuxCloud.Core.Database.Implementations.Rows;
    using MuxCloud.Core.Database.Interfaces;
    using MuxCloud.Core.Models;

    /// <summary>
    /// Push device data access. Portable SQL; engine differences live in the dialect.
    /// Thread safety: safe to call concurrently.
    /// </summary>
    public class DeviceMethods : IDeviceMethods
    {
        #region Private-Members

        private readonly DatabaseExecutor _Db;

        #endregion

        #region Constructors-and-Factories

        /// <summary>
        /// Instantiate.
        /// </summary>
        /// <param name="db">Executor.</param>
        /// <exception cref="ArgumentNullException">db is null.</exception>
        public DeviceMethods(DatabaseExecutor db)
        {
            ArgumentNullException.ThrowIfNull(db);
            _Db = db;
        }

        #endregion

        #region Public-Methods

        /// <inheritdoc />
        public async Task<Device> CreateAsync(Device device, CancellationToken token = default)
        {
            ArgumentNullException.ThrowIfNull(device);
            await _Db.ExecuteAsync(DeviceRow.Insert, DeviceRow.Parameters(device), token).ConfigureAwait(false);
            return device;
        }

        /// <inheritdoc />
        public Task<Device?> ReadAsync(string tenantId, string id, CancellationToken token = default)
        {
            return _Db.QueryFirstAsync("SELECT " + DeviceRow.Columns + " FROM devices WHERE tenant_id = @tenant_id AND id = @id", new SqlParameters().Add("tenant_id", tenantId).Add("id", id), DeviceRow.Map, token);
        }

        /// <inheritdoc />
        public Task<Device?> ReadByTokenAsync(string tenantId, string userId, string expoPushToken, CancellationToken token = default)
        {
            SqlParameters p = new SqlParameters().Add("tenant_id", tenantId).Add("user_id", userId).Add("t", expoPushToken);
            return _Db.QueryFirstAsync("SELECT " + DeviceRow.Columns + " FROM devices WHERE tenant_id = @tenant_id AND user_id = @user_id AND expo_push_token = @t", p, DeviceRow.Map, token);
        }

        /// <inheritdoc />
        public async Task<Device> UpdateAsync(Device device, CancellationToken token = default)
        {
            ArgumentNullException.ThrowIfNull(device);
            device.LastUpdateUtc = DateTime.UtcNow;
            await _Db.ExecuteAsync(DeviceRow.Update, DeviceRow.Parameters(device), token).ConfigureAwait(false);
            return device;
        }

        /// <inheritdoc />
        public Task<List<Device>> ListForUserAsync(string tenantId, string userId, CancellationToken token = default)
        {
            return _Db.QueryAsync("SELECT " + DeviceRow.Columns + " FROM devices WHERE tenant_id = @tenant_id AND user_id = @user_id ORDER BY created_utc DESC, id DESC", new SqlParameters().Add("tenant_id", tenantId).Add("user_id", userId), DeviceRow.Map, token);
        }

        /// <inheritdoc />
        public async Task<bool> DeleteAsync(string tenantId, string id, CancellationToken token = default)
        {
            int rows = await _Db.ExecuteAsync("DELETE FROM devices WHERE tenant_id = @tenant_id AND id = @id", new SqlParameters().Add("tenant_id", tenantId).Add("id", id), token).ConfigureAwait(false);
            return rows > 0;
        }

        /// <inheritdoc />
        public async Task DeleteForUserAsync(string tenantId, string userId, CancellationToken token = default)
        {
            await _Db.ExecuteAsync("DELETE FROM devices WHERE tenant_id = @tenant_id AND user_id = @user_id", new SqlParameters().Add("tenant_id", tenantId).Add("user_id", userId), token).ConfigureAwait(false);
        }

        /// <inheritdoc />
        public Task<int> DeleteByTokenAsync(string expoPushToken, CancellationToken token = default)
        {
            return _Db.ExecuteAsync("DELETE FROM devices WHERE expo_push_token = @t", new SqlParameters().Add("t", expoPushToken), token);
        }

        #endregion
    }
}
