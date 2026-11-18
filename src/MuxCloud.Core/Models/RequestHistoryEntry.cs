namespace MuxCloud.Core.Models
{
    using System;
    using System.Collections.Generic;
    using MuxCloud.Core.Helpers;

    /// <summary>
    /// One captured HTTP request. Relay routes never capture bodies.
    /// </summary>
    public class RequestHistoryEntry
    {
        #region Public-Members

        /// <summary>
        /// Entry identifier (prefix req_).
        /// </summary>
        public string Id { get; set; } = IdGenerator.NewId(Constants.RequestPrefix);

        /// <summary>
        /// Tenant of the caller, or empty.
        /// </summary>
        public string TenantId { get; set; } = String.Empty;

        /// <summary>
        /// Caller, or empty.
        /// </summary>
        public string UserId { get; set; } = String.Empty;

        /// <summary>
        /// HTTP method.
        /// </summary>
        public string Method { get; set; } = String.Empty;

        /// <summary>
        /// Request path without query (relay paths are recorded as their template).
        /// </summary>
        public string Path { get; set; } = String.Empty;

        /// <summary>
        /// Route template.
        /// </summary>
        public string PathTemplate { get; set; } = String.Empty;

        /// <summary>
        /// Response status.
        /// </summary>
        public int StatusCode { get; set; } = 0;

        /// <summary>
        /// Duration in milliseconds.
        /// </summary>
        public double DurationMs { get; set; } = 0;

        /// <summary>
        /// Request body size.
        /// </summary>
        public long RequestBytes { get; set; } = 0;

        /// <summary>
        /// Response body size.
        /// </summary>
        public long ResponseBytes { get; set; } = 0;

        /// <summary>
        /// Requester IP.
        /// </summary>
        public string SourceIp { get; set; } = String.Empty;

        /// <summary>
        /// Requester user agent.
        /// </summary>
        public string UserAgent { get; set; } = String.Empty;

        /// <summary>
        /// Whether the request was relayed to a machine.
        /// </summary>
        public bool IsRelay { get; set; } = false;

        /// <summary>
        /// Redacted request headers by name. Empty for relay routes and in list results.
        /// </summary>
        public Dictionary<string, string> RequestHeaders
        {
            get { return _RequestHeaders; }
            set { _RequestHeaders = value ?? new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase); }
        }

        /// <summary>
        /// Redacted response headers by name. Empty for relay routes and in list results.
        /// </summary>
        public Dictionary<string, string> ResponseHeaders
        {
            get { return _ResponseHeaders; }
            set { _ResponseHeaders = value ?? new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase); }
        }

        /// <summary>
        /// Truncated request body. Unmanaged diagnostic text; empty for relay routes.
        /// </summary>
        public string RequestBody { get; set; } = String.Empty;

        /// <summary>
        /// Truncated response body. Unmanaged diagnostic text; empty for relay routes.
        /// </summary>
        public string ResponseBody { get; set; } = String.Empty;

        /// <summary>
        /// Whether the request body was truncated.
        /// </summary>
        public bool RequestBodyTruncated { get; set; } = false;

        /// <summary>
        /// Whether the response body was truncated.
        /// </summary>
        public bool ResponseBodyTruncated { get; set; } = false;

        /// <summary>
        /// Capture time, UTC.
        /// </summary>
        public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;

        #endregion

        #region Private-Members

        private Dictionary<string, string> _RequestHeaders = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        private Dictionary<string, string> _ResponseHeaders = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        #endregion
    }
}
