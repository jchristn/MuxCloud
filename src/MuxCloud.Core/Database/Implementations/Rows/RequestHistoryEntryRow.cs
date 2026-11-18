namespace MuxCloud.Core.Database.Implementations.Rows
{
    using System;
    using System.Data.Common;
    using MuxCloud.Core.Helpers;
    using MuxCloud.Core.Models;

    /// <summary>
    /// Column mapping for the request_history table: column list, row mapper, parameters, and portable insert and update statements.
    /// Thread safety: stateless.
    /// </summary>
    public static class RequestHistoryEntryRow
    {
        #region Public-Members

        /// <summary>
        /// Table name.
        /// </summary>
        public const string Table = "request_history";

        /// <summary>
        /// Comma-separated column list.
        /// </summary>
        public const string Columns = "id, tenant_id, user_id, method, path, path_template, status_code, duration_ms, request_bytes, response_bytes, source_ip, user_agent, is_relay, request_headers, response_headers, request_body, response_body, request_body_truncated, response_body_truncated, created_utc";

        /// <summary>
        /// Insert statement.
        /// </summary>
        public const string Insert = "INSERT INTO request_history (id, tenant_id, user_id, method, path, path_template, status_code, duration_ms, request_bytes, response_bytes, source_ip, user_agent, is_relay, request_headers, response_headers, request_body, response_body, request_body_truncated, response_body_truncated, created_utc) VALUES (@id, @tenant_id, @user_id, @method, @path, @path_template, @status_code, @duration_ms, @request_bytes, @response_bytes, @source_ip, @user_agent, @is_relay, @request_headers, @response_headers, @request_body, @response_body, @request_body_truncated, @response_body_truncated, @created_utc)";

        /// <summary>
        /// Update-by-identifier statement.
        /// </summary>
        public const string Update = "UPDATE request_history SET tenant_id = @tenant_id, user_id = @user_id, method = @method, path = @path, path_template = @path_template, status_code = @status_code, duration_ms = @duration_ms, request_bytes = @request_bytes, response_bytes = @response_bytes, source_ip = @source_ip, user_agent = @user_agent, is_relay = @is_relay, request_headers = @request_headers, response_headers = @response_headers, request_body = @request_body, response_body = @response_body, request_body_truncated = @request_body_truncated, response_body_truncated = @response_body_truncated, created_utc = @created_utc WHERE id = @id";

        #endregion

        #region Public-Methods

        /// <summary>
        /// Map the current row.
        /// </summary>
        /// <param name="reader">Reader positioned on a row.</param>
        /// <returns>Model.</returns>
        public static RequestHistoryEntry Map(DbDataReader reader)
        {
            ArgumentNullException.ThrowIfNull(reader);
            return new RequestHistoryEntry
            {
                Id = Converters.String(reader, "id"),
                TenantId = Converters.String(reader, "tenant_id"),
                UserId = Converters.String(reader, "user_id"),
                Method = Converters.String(reader, "method"),
                Path = Converters.String(reader, "path"),
                PathTemplate = Converters.String(reader, "path_template"),
                StatusCode = Converters.Int(reader, "status_code"),
                DurationMs = Converters.Double(reader, "duration_ms"),
                RequestBytes = Converters.Long(reader, "request_bytes"),
                ResponseBytes = Converters.Long(reader, "response_bytes"),
                SourceIp = Converters.String(reader, "source_ip"),
                UserAgent = Converters.String(reader, "user_agent"),
                IsRelay = Converters.Bool(reader, "is_relay"),
                RequestHeaders = HeaderLines.Parse(Converters.String(reader, "request_headers")),
                ResponseHeaders = HeaderLines.Parse(Converters.String(reader, "response_headers")),
                RequestBody = Converters.String(reader, "request_body"),
                ResponseBody = Converters.String(reader, "response_body"),
                RequestBodyTruncated = Converters.Bool(reader, "request_body_truncated"),
                ResponseBodyTruncated = Converters.Bool(reader, "response_body_truncated"),
                CreatedUtc = Converters.Utc(reader, "created_utc")
            };
        }

        /// <summary>
        /// Parameters for every column.
        /// </summary>
        /// <param name="item">Model.</param>
        /// <returns>Parameters.</returns>
        public static SqlParameters Parameters(RequestHistoryEntry item)
        {
            ArgumentNullException.ThrowIfNull(item);
            return new SqlParameters()
                .Add("id", item.Id)
                .Add("tenant_id", item.TenantId)
                .Add("user_id", item.UserId)
                .Add("method", item.Method)
                .Add("path", item.Path)
                .Add("path_template", item.PathTemplate)
                .Add("status_code", item.StatusCode)
                .Add("duration_ms", item.DurationMs)
                .Add("request_bytes", item.RequestBytes)
                .Add("response_bytes", item.ResponseBytes)
                .Add("source_ip", item.SourceIp)
                .Add("user_agent", item.UserAgent)
                .Add("is_relay", item.IsRelay)
                .Add("request_headers", HeaderLines.Format(item.RequestHeaders))
                .Add("response_headers", HeaderLines.Format(item.ResponseHeaders))
                .Add("request_body", item.RequestBody)
                .Add("response_body", item.ResponseBody)
                .Add("request_body_truncated", item.RequestBodyTruncated)
                .Add("response_body_truncated", item.ResponseBodyTruncated)
                .Add("created_utc", item.CreatedUtc);
        }

        #endregion
    }
}
