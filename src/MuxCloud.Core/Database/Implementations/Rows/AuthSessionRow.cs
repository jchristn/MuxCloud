namespace MuxCloud.Core.Database.Implementations.Rows
{
    using System;
    using System.Data.Common;
    using MuxCloud.Core.Models;

    /// <summary>
    /// Column mapping for the auth_sessions table: column list, row mapper, parameters, and portable insert and update statements.
    /// Thread safety: stateless.
    /// </summary>
    public static class AuthSessionRow
    {
        #region Public-Members

        /// <summary>
        /// Table name.
        /// </summary>
        public const string Table = "auth_sessions";

        /// <summary>
        /// Comma-separated column list.
        /// </summary>
        public const string Columns = "id, tenant_id, user_id, client, device_name, source_ip, user_agent, refresh_token_hash, previous_refresh_token_hash, refresh_expires_utc, last_used_utc, revoked_utc, revocation_reason, created_utc";

        /// <summary>
        /// Insert statement.
        /// </summary>
        public const string Insert = "INSERT INTO auth_sessions (id, tenant_id, user_id, client, device_name, source_ip, user_agent, refresh_token_hash, previous_refresh_token_hash, refresh_expires_utc, last_used_utc, revoked_utc, revocation_reason, created_utc) VALUES (@id, @tenant_id, @user_id, @client, @device_name, @source_ip, @user_agent, @refresh_token_hash, @previous_refresh_token_hash, @refresh_expires_utc, @last_used_utc, @revoked_utc, @revocation_reason, @created_utc)";

        /// <summary>
        /// Update-by-identifier statement.
        /// </summary>
        public const string Update = "UPDATE auth_sessions SET tenant_id = @tenant_id, user_id = @user_id, client = @client, device_name = @device_name, source_ip = @source_ip, user_agent = @user_agent, refresh_token_hash = @refresh_token_hash, previous_refresh_token_hash = @previous_refresh_token_hash, refresh_expires_utc = @refresh_expires_utc, last_used_utc = @last_used_utc, revoked_utc = @revoked_utc, revocation_reason = @revocation_reason, created_utc = @created_utc WHERE id = @id";

        #endregion

        #region Public-Methods

        /// <summary>
        /// Map the current row.
        /// </summary>
        /// <param name="reader">Reader positioned on a row.</param>
        /// <returns>Model.</returns>
        public static AuthSession Map(DbDataReader reader)
        {
            ArgumentNullException.ThrowIfNull(reader);
            return new AuthSession
            {
                Id = Converters.String(reader, "id"),
                TenantId = Converters.String(reader, "tenant_id"),
                UserId = Converters.String(reader, "user_id"),
                Client = Converters.String(reader, "client"),
                DeviceName = Converters.String(reader, "device_name"),
                SourceIp = Converters.String(reader, "source_ip"),
                UserAgent = Converters.String(reader, "user_agent"),
                RefreshTokenHash = Converters.String(reader, "refresh_token_hash"),
                PreviousRefreshTokenHash = Converters.String(reader, "previous_refresh_token_hash"),
                RefreshExpiresUtc = Converters.Utc(reader, "refresh_expires_utc"),
                LastUsedUtc = Converters.Utc(reader, "last_used_utc"),
                RevokedUtc = Converters.NullableUtc(reader, "revoked_utc"),
                RevocationReason = Converters.String(reader, "revocation_reason"),
                CreatedUtc = Converters.Utc(reader, "created_utc")
            };
        }

        /// <summary>
        /// Parameters for every column.
        /// </summary>
        /// <param name="item">Model.</param>
        /// <returns>Parameters.</returns>
        public static SqlParameters Parameters(AuthSession item)
        {
            ArgumentNullException.ThrowIfNull(item);
            return new SqlParameters()
                .Add("id", item.Id)
                .Add("tenant_id", item.TenantId)
                .Add("user_id", item.UserId)
                .Add("client", item.Client)
                .Add("device_name", item.DeviceName)
                .Add("source_ip", item.SourceIp)
                .Add("user_agent", item.UserAgent)
                .Add("refresh_token_hash", item.RefreshTokenHash)
                .Add("previous_refresh_token_hash", item.PreviousRefreshTokenHash)
                .Add("refresh_expires_utc", item.RefreshExpiresUtc)
                .Add("last_used_utc", item.LastUsedUtc)
                .Add("revoked_utc", item.RevokedUtc)
                .Add("revocation_reason", item.RevocationReason)
                .Add("created_utc", item.CreatedUtc);
        }

        #endregion
    }
}
