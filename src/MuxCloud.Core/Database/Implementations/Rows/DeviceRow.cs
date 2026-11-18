namespace MuxCloud.Core.Database.Implementations.Rows
{
    using System;
    using System.Data.Common;
    using MuxCloud.Core.Models;

    /// <summary>
    /// Column mapping for the devices table: column list, row mapper, parameters, and portable insert and update statements.
    /// Thread safety: stateless.
    /// </summary>
    public static class DeviceRow
    {
        #region Public-Members

        /// <summary>
        /// Table name.
        /// </summary>
        public const string Table = "devices";

        /// <summary>
        /// Comma-separated column list.
        /// </summary>
        public const string Columns = "id, tenant_id, user_id, expo_push_token, platform, name, created_utc, last_update_utc";

        /// <summary>
        /// Insert statement.
        /// </summary>
        public const string Insert = "INSERT INTO devices (id, tenant_id, user_id, expo_push_token, platform, name, created_utc, last_update_utc) VALUES (@id, @tenant_id, @user_id, @expo_push_token, @platform, @name, @created_utc, @last_update_utc)";

        /// <summary>
        /// Update-by-identifier statement.
        /// </summary>
        public const string Update = "UPDATE devices SET tenant_id = @tenant_id, user_id = @user_id, expo_push_token = @expo_push_token, platform = @platform, name = @name, created_utc = @created_utc, last_update_utc = @last_update_utc WHERE id = @id";

        #endregion

        #region Public-Methods

        /// <summary>
        /// Map the current row.
        /// </summary>
        /// <param name="reader">Reader positioned on a row.</param>
        /// <returns>Model.</returns>
        public static Device Map(DbDataReader reader)
        {
            ArgumentNullException.ThrowIfNull(reader);
            return new Device
            {
                Id = Converters.String(reader, "id"),
                TenantId = Converters.String(reader, "tenant_id"),
                UserId = Converters.String(reader, "user_id"),
                ExpoPushToken = Converters.String(reader, "expo_push_token"),
                Platform = Converters.String(reader, "platform"),
                Name = Converters.String(reader, "name"),
                CreatedUtc = Converters.Utc(reader, "created_utc"),
                LastUpdateUtc = Converters.Utc(reader, "last_update_utc")
            };
        }

        /// <summary>
        /// Parameters for every column.
        /// </summary>
        /// <param name="item">Model.</param>
        /// <returns>Parameters.</returns>
        public static SqlParameters Parameters(Device item)
        {
            ArgumentNullException.ThrowIfNull(item);
            return new SqlParameters()
                .Add("id", item.Id)
                .Add("tenant_id", item.TenantId)
                .Add("user_id", item.UserId)
                .Add("expo_push_token", item.ExpoPushToken)
                .Add("platform", item.Platform)
                .Add("name", item.Name)
                .Add("created_utc", item.CreatedUtc)
                .Add("last_update_utc", item.LastUpdateUtc);
        }

        #endregion
    }
}
