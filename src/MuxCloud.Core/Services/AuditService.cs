namespace MuxCloud.Core.Services
{
    using System;
    using System.Threading;
    using System.Threading.Tasks;
    using MuxCloud.Core.Database;
    using MuxCloud.Core.Models;

    /// <summary>
    /// Writes audit records. Failures never break the request that caused them.
    /// Thread safety: safe to call concurrently.
    /// </summary>
    public class AuditService
    {
        #region Public-Members

        /// <summary>
        /// Called with a message when a write fails, or null.
        /// </summary>
        public Action<string>? OnError { get; set; } = null;

        #endregion

        #region Private-Members

        private readonly DatabaseDriverBase _Db;

        #endregion

        #region Constructors-and-Factories

        /// <summary>
        /// Instantiate.
        /// </summary>
        /// <param name="db">Database.</param>
        /// <exception cref="ArgumentNullException">db is null.</exception>
        public AuditService(DatabaseDriverBase db)
        {
            ArgumentNullException.ThrowIfNull(db);
            _Db = db;
        }

        #endregion

        #region Public-Methods

        /// <summary>
        /// Write a record (best effort).
        /// </summary>
        /// <param name="eventType">Event type, for example auth.login.</param>
        /// <param name="result">success, failure, or denied.</param>
        /// <param name="tenantId">Tenant, or empty.</param>
        /// <param name="userId">User, or empty.</param>
        /// <param name="resourceType">Resource type, or empty.</param>
        /// <param name="resourceId">Resource identifier, or empty.</param>
        /// <param name="sourceIp">Requester IP, or empty.</param>
        /// <param name="message">Detail; never secrets.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Task.</returns>
        public async Task WriteAsync(string eventType, string result, string? tenantId, string? userId, string? resourceType, string? resourceId, string? sourceIp, string? message, CancellationToken token = default)
        {
            try
            {
                AuditRecord record = new AuditRecord
                {
                    EventType = eventType ?? String.Empty,
                    Result = result ?? "success",
                    TenantId = tenantId ?? String.Empty,
                    UserId = userId ?? String.Empty,
                    ResourceType = resourceType ?? String.Empty,
                    ResourceId = resourceId ?? String.Empty,
                    SourceIp = sourceIp ?? String.Empty,
                    Message = Truncate(message, 1000)
                };
                await _Db.Audit.CreateAsync(record, token).ConfigureAwait(false);
            }
            catch (Exception e) when (!(e is OperationCanceledException))
            {
                OnError?.Invoke("audit write failed for " + eventType + ": " + e.Message);
            }
        }

        #endregion

        #region Private-Methods

        private static string Truncate(string? value, int max)
        {
            if (String.IsNullOrEmpty(value)) return String.Empty;
            return value.Length <= max ? value : value.Substring(0, max);
        }

        #endregion
    }
}
