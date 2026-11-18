namespace MuxCloud.Core.Database.Implementations.Rows
{
    using System;
    using System.Data.Common;
    using MuxCloud.Core.Models;

    /// <summary>
    /// Column mapping for the machines table: column list, row mapper, parameters, and portable insert and update statements.
    /// Thread safety: stateless.
    /// </summary>
    public static class MachineRow
    {
        #region Public-Members

        /// <summary>
        /// Table name.
        /// </summary>
        public const string Table = "machines";

        /// <summary>
        /// Comma-separated column list.
        /// </summary>
        public const string Columns = "id, tenant_id, user_id, name, hostname, os, fingerprint, mux_version, protocol_version, secret_encrypted, secret_last4, last_seen_utc, last_connected_utc, last_disconnected_utc, active_runs, awaiting_approval, remote_tool_approval, revoked_utc, created_utc, last_update_utc";

        /// <summary>
        /// Insert statement.
        /// </summary>
        public const string Insert = "INSERT INTO machines (id, tenant_id, user_id, name, hostname, os, fingerprint, mux_version, protocol_version, secret_encrypted, secret_last4, last_seen_utc, last_connected_utc, last_disconnected_utc, active_runs, awaiting_approval, remote_tool_approval, revoked_utc, created_utc, last_update_utc) VALUES (@id, @tenant_id, @user_id, @name, @hostname, @os, @fingerprint, @mux_version, @protocol_version, @secret_encrypted, @secret_last4, @last_seen_utc, @last_connected_utc, @last_disconnected_utc, @active_runs, @awaiting_approval, @remote_tool_approval, @revoked_utc, @created_utc, @last_update_utc)";

        /// <summary>
        /// Update-by-identifier statement.
        /// </summary>
        public const string Update = "UPDATE machines SET tenant_id = @tenant_id, user_id = @user_id, name = @name, hostname = @hostname, os = @os, fingerprint = @fingerprint, mux_version = @mux_version, protocol_version = @protocol_version, secret_encrypted = @secret_encrypted, secret_last4 = @secret_last4, last_seen_utc = @last_seen_utc, last_connected_utc = @last_connected_utc, last_disconnected_utc = @last_disconnected_utc, active_runs = @active_runs, awaiting_approval = @awaiting_approval, remote_tool_approval = @remote_tool_approval, revoked_utc = @revoked_utc, created_utc = @created_utc, last_update_utc = @last_update_utc WHERE id = @id";

        #endregion

        #region Public-Methods

        /// <summary>
        /// Map the current row.
        /// </summary>
        /// <param name="reader">Reader positioned on a row.</param>
        /// <returns>Model.</returns>
        public static Machine Map(DbDataReader reader)
        {
            ArgumentNullException.ThrowIfNull(reader);
            return new Machine
            {
                Id = Converters.String(reader, "id"),
                TenantId = Converters.String(reader, "tenant_id"),
                UserId = Converters.String(reader, "user_id"),
                Name = Converters.String(reader, "name"),
                Hostname = Converters.String(reader, "hostname"),
                Os = Converters.String(reader, "os"),
                Fingerprint = Converters.String(reader, "fingerprint"),
                MuxVersion = Converters.String(reader, "mux_version"),
                ProtocolVersion = Converters.Int(reader, "protocol_version"),
                SecretEncrypted = Converters.String(reader, "secret_encrypted"),
                SecretLast4 = Converters.String(reader, "secret_last4"),
                LastSeenUtc = Converters.NullableUtc(reader, "last_seen_utc"),
                LastConnectedUtc = Converters.NullableUtc(reader, "last_connected_utc"),
                LastDisconnectedUtc = Converters.NullableUtc(reader, "last_disconnected_utc"),
                ActiveRuns = Converters.Int(reader, "active_runs"),
                AwaitingApproval = Converters.Int(reader, "awaiting_approval"),
                RemoteToolApproval = Converters.Bool(reader, "remote_tool_approval"),
                RevokedUtc = Converters.NullableUtc(reader, "revoked_utc"),
                CreatedUtc = Converters.Utc(reader, "created_utc"),
                LastUpdateUtc = Converters.Utc(reader, "last_update_utc")
            };
        }

        /// <summary>
        /// Parameters for every column.
        /// </summary>
        /// <param name="item">Model.</param>
        /// <returns>Parameters.</returns>
        public static SqlParameters Parameters(Machine item)
        {
            ArgumentNullException.ThrowIfNull(item);
            return new SqlParameters()
                .Add("id", item.Id)
                .Add("tenant_id", item.TenantId)
                .Add("user_id", item.UserId)
                .Add("name", item.Name)
                .Add("hostname", item.Hostname)
                .Add("os", item.Os)
                .Add("fingerprint", item.Fingerprint)
                .Add("mux_version", item.MuxVersion)
                .Add("protocol_version", item.ProtocolVersion)
                .Add("secret_encrypted", item.SecretEncrypted)
                .Add("secret_last4", item.SecretLast4)
                .Add("last_seen_utc", item.LastSeenUtc)
                .Add("last_connected_utc", item.LastConnectedUtc)
                .Add("last_disconnected_utc", item.LastDisconnectedUtc)
                .Add("active_runs", item.ActiveRuns)
                .Add("awaiting_approval", item.AwaitingApproval)
                .Add("remote_tool_approval", item.RemoteToolApproval)
                .Add("revoked_utc", item.RevokedUtc)
                .Add("created_utc", item.CreatedUtc)
                .Add("last_update_utc", item.LastUpdateUtc);
        }

        #endregion
    }
}
