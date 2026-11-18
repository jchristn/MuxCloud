namespace MuxCloud.Core.Database.Implementations.Rows
{
    using System;
    using System.Data.Common;
    using MuxCloud.Core.Models;

    /// <summary>
    /// Column mapping for the machine_connections table: column list, row mapper, parameters, and portable insert and update statements.
    /// Thread safety: stateless.
    /// </summary>
    public static class MachineConnectionRow
    {
        #region Public-Members

        /// <summary>
        /// Table name.
        /// </summary>
        public const string Table = "machine_connections";

        /// <summary>
        /// Comma-separated column list.
        /// </summary>
        public const string Columns = "id, tenant_id, machine_id, node_id, remote_ip, protocol_version, mux_version, connected_utc, disconnected_utc, close_code, close_reason, bytes_in, bytes_out";

        /// <summary>
        /// Insert statement.
        /// </summary>
        public const string Insert = "INSERT INTO machine_connections (id, tenant_id, machine_id, node_id, remote_ip, protocol_version, mux_version, connected_utc, disconnected_utc, close_code, close_reason, bytes_in, bytes_out) VALUES (@id, @tenant_id, @machine_id, @node_id, @remote_ip, @protocol_version, @mux_version, @connected_utc, @disconnected_utc, @close_code, @close_reason, @bytes_in, @bytes_out)";

        /// <summary>
        /// Update-by-identifier statement.
        /// </summary>
        public const string Update = "UPDATE machine_connections SET tenant_id = @tenant_id, machine_id = @machine_id, node_id = @node_id, remote_ip = @remote_ip, protocol_version = @protocol_version, mux_version = @mux_version, connected_utc = @connected_utc, disconnected_utc = @disconnected_utc, close_code = @close_code, close_reason = @close_reason, bytes_in = @bytes_in, bytes_out = @bytes_out WHERE id = @id";

        #endregion

        #region Public-Methods

        /// <summary>
        /// Map the current row.
        /// </summary>
        /// <param name="reader">Reader positioned on a row.</param>
        /// <returns>Model.</returns>
        public static MachineConnection Map(DbDataReader reader)
        {
            ArgumentNullException.ThrowIfNull(reader);
            return new MachineConnection
            {
                Id = Converters.String(reader, "id"),
                TenantId = Converters.String(reader, "tenant_id"),
                MachineId = Converters.String(reader, "machine_id"),
                NodeId = Converters.String(reader, "node_id"),
                RemoteIp = Converters.String(reader, "remote_ip"),
                ProtocolVersion = Converters.Int(reader, "protocol_version"),
                MuxVersion = Converters.String(reader, "mux_version"),
                ConnectedUtc = Converters.Utc(reader, "connected_utc"),
                DisconnectedUtc = Converters.NullableUtc(reader, "disconnected_utc"),
                CloseCode = Converters.NullableInt(reader, "close_code"),
                CloseReason = Converters.String(reader, "close_reason"),
                BytesIn = Converters.Long(reader, "bytes_in"),
                BytesOut = Converters.Long(reader, "bytes_out")
            };
        }

        /// <summary>
        /// Parameters for every column.
        /// </summary>
        /// <param name="item">Model.</param>
        /// <returns>Parameters.</returns>
        public static SqlParameters Parameters(MachineConnection item)
        {
            ArgumentNullException.ThrowIfNull(item);
            return new SqlParameters()
                .Add("id", item.Id)
                .Add("tenant_id", item.TenantId)
                .Add("machine_id", item.MachineId)
                .Add("node_id", item.NodeId)
                .Add("remote_ip", item.RemoteIp)
                .Add("protocol_version", item.ProtocolVersion)
                .Add("mux_version", item.MuxVersion)
                .Add("connected_utc", item.ConnectedUtc)
                .Add("disconnected_utc", item.DisconnectedUtc)
                .Add("close_code", item.CloseCode)
                .Add("close_reason", item.CloseReason)
                .Add("bytes_in", item.BytesIn)
                .Add("bytes_out", item.BytesOut);
        }

        #endregion
    }
}
