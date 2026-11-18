namespace MuxCloud.Core.Database.Implementations.Rows
{
    using System;
    using System.Data.Common;
    using MuxCloud.Core.Models;

    /// <summary>
    /// Column mapping for the audit_records table: column list, row mapper, parameters, and portable insert and update statements.
    /// Thread safety: stateless.
    /// </summary>
    public static class AuditRecordRow
    {
        #region Public-Members

        /// <summary>
        /// Table name.
        /// </summary>
        public const string Table = "audit_records";

        /// <summary>
        /// Comma-separated column list.
        /// </summary>
        public const string Columns = "id, tenant_id, user_id, event_type, result, reason, resource_type, resource_id, source_ip, user_agent, request_id, message, created_utc";

        /// <summary>
        /// Insert statement.
        /// </summary>
        public const string Insert = "INSERT INTO audit_records (id, tenant_id, user_id, event_type, result, reason, resource_type, resource_id, source_ip, user_agent, request_id, message, created_utc) VALUES (@id, @tenant_id, @user_id, @event_type, @result, @reason, @resource_type, @resource_id, @source_ip, @user_agent, @request_id, @message, @created_utc)";

        /// <summary>
        /// Update-by-identifier statement.
        /// </summary>
        public const string Update = "UPDATE audit_records SET tenant_id = @tenant_id, user_id = @user_id, event_type = @event_type, result = @result, reason = @reason, resource_type = @resource_type, resource_id = @resource_id, source_ip = @source_ip, user_agent = @user_agent, request_id = @request_id, message = @message, created_utc = @created_utc WHERE id = @id";

        #endregion

        #region Public-Methods

        /// <summary>
        /// Map the current row.
        /// </summary>
        /// <param name="reader">Reader positioned on a row.</param>
        /// <returns>Model.</returns>
        public static AuditRecord Map(DbDataReader reader)
        {
            ArgumentNullException.ThrowIfNull(reader);
            return new AuditRecord
            {
                Id = Converters.String(reader, "id"),
                TenantId = Converters.String(reader, "tenant_id"),
                UserId = Converters.String(reader, "user_id"),
                EventType = Converters.String(reader, "event_type"),
                Result = Converters.String(reader, "result"),
                Reason = Converters.String(reader, "reason"),
                ResourceType = Converters.String(reader, "resource_type"),
                ResourceId = Converters.String(reader, "resource_id"),
                SourceIp = Converters.String(reader, "source_ip"),
                UserAgent = Converters.String(reader, "user_agent"),
                RequestId = Converters.String(reader, "request_id"),
                Message = Converters.String(reader, "message"),
                CreatedUtc = Converters.Utc(reader, "created_utc")
            };
        }

        /// <summary>
        /// Parameters for every column.
        /// </summary>
        /// <param name="item">Model.</param>
        /// <returns>Parameters.</returns>
        public static SqlParameters Parameters(AuditRecord item)
        {
            ArgumentNullException.ThrowIfNull(item);
            return new SqlParameters()
                .Add("id", item.Id)
                .Add("tenant_id", item.TenantId)
                .Add("user_id", item.UserId)
                .Add("event_type", item.EventType)
                .Add("result", item.Result)
                .Add("reason", item.Reason)
                .Add("resource_type", item.ResourceType)
                .Add("resource_id", item.ResourceId)
                .Add("source_ip", item.SourceIp)
                .Add("user_agent", item.UserAgent)
                .Add("request_id", item.RequestId)
                .Add("message", item.Message)
                .Add("created_utc", item.CreatedUtc);
        }

        #endregion
    }
}
