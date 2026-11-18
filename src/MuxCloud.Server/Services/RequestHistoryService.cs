namespace MuxCloud.Server.Services
{
    using System;
    using System.Collections.Generic;
    using System.Collections.Specialized;
    using System.Linq;
    using System.Text;
    using System.Threading;
    using System.Threading.Tasks;
    using MuxCloud.Core.Database;
    using MuxCloud.Core.Models;
    using MuxCloud.Core.Settings;
    using MuxCloud.Server.Http;
    using WatsonWebserver.Core;

    /// <summary>
    /// Captures each request after routing (fire and forget). Relay routes, credential routes, and token routes never have
    /// bodies captured; sensitive headers are redacted. Old entries are pruned hourly.
    /// Thread safety: safe to call concurrently.
    /// </summary>
    public class RequestHistoryService
    {
        #region Private-Members

        private static readonly HashSet<string> _Redacted = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "Authorization", "Proxy-Authorization", "Cookie", "Set-Cookie" };
        private readonly DatabaseDriverBase _Db;
        private readonly RequestHistorySettings _Settings;
        private readonly Action<string> _OnError;

        #endregion

        #region Constructors-and-Factories

        /// <summary>
        /// Instantiate.
        /// </summary>
        /// <param name="db">Database.</param>
        /// <param name="settings">Capture settings.</param>
        /// <param name="onError">Error log.</param>
        /// <exception cref="ArgumentNullException">An argument is null.</exception>
        public RequestHistoryService(DatabaseDriverBase db, RequestHistorySettings settings, Action<string> onError)
        {
            ArgumentNullException.ThrowIfNull(db);
            ArgumentNullException.ThrowIfNull(settings);
            ArgumentNullException.ThrowIfNull(onError);
            _Db = db;
            _Settings = settings;
            _OnError = onError;
        }

        #endregion

        #region Public-Methods

        /// <summary>
        /// Capture a finished request without blocking it.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        public void Capture(HttpContextBase ctx)
        {
            if (!_Settings.Enabled || ctx?.Metadata is not RequestContext rc) return;
            string path = ctx.Request.Url.RawWithoutQuery ?? String.Empty;
            if (!ShouldCapture(path, rc.IsRelay)) return;
            RequestHistoryEntry entry = new RequestHistoryEntry
            {
                TenantId = rc.User?.TenantId ?? String.Empty,
                UserId = rc.User?.Id ?? String.Empty,
                Method = ctx.Request.Method.ToString(),
                Path = rc.IsRelay ? "/m/{machineId}/*" : Truncate(path, 2048),
                PathTemplate = String.IsNullOrEmpty(rc.PathTemplate) ? Truncate(path, 512) : rc.PathTemplate,
                StatusCode = ctx.Response.StatusCode,
                DurationMs = ctx.Timestamp.TotalMs ?? 0,
                RequestBytes = Math.Max(0, ctx.Request.ContentLength),
                ResponseBytes = rc.IsRelay ? rc.ResponseBytes : Encoding.UTF8.GetByteCount(rc.CapturedResponseBody),
                SourceIp = Truncate(rc.SourceIp, 64),
                UserAgent = Truncate(rc.UserAgent, 500),
                IsRelay = rc.IsRelay,
                RequestHeaders = rc.IsRelay ? new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase) : Redact(ctx.Request.Headers),
                ResponseHeaders = rc.IsRelay ? new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase) : Redact(ctx.Response.Headers),
                CreatedUtc = DateTime.UtcNow
            };
            if (!rc.IsRelay && !rc.SkipBodyCapture)
            {
                entry.RequestBody = Cap(rc.CapturedRequestBody, _Settings.MaxRequestBodyBytes, out bool requestTruncated);
                entry.RequestBodyTruncated = requestTruncated;
                entry.ResponseBody = Cap(rc.CapturedResponseBody, _Settings.MaxResponseBodyBytes, out bool responseTruncated);
                entry.ResponseBodyTruncated = responseTruncated;
            }

            _ = Task.Run(async () =>
            {
                try
                {
                    await _Db.RequestHistory.CreateAsync(entry, CancellationToken.None).ConfigureAwait(false);
                }
                catch (Exception e)
                {
                    _OnError("request history capture failed: " + e.Message);
                }
            });
        }

        /// <summary>
        /// Delete entries older than the retention window.
        /// </summary>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Entries deleted.</returns>
        public Task<int> PruneAsync(CancellationToken token = default)
        {
            return _Db.RequestHistory.DeleteOlderThanAsync(DateTime.UtcNow.AddDays(-_Settings.RetentionDays), token);
        }

        /// <summary>
        /// Summarize a range into buckets, including empty ones.
        /// </summary>
        /// <param name="fromUtc">Start.</param>
        /// <param name="toUtc">End.</param>
        /// <param name="bucketMinutes">Bucket width, minimum 1.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Summary.</returns>
        public async Task<RequestHistorySummary> SummarizeAsync(DateTime fromUtc, DateTime toUtc, int bucketMinutes, CancellationToken token = default)
        {
            bucketMinutes = Math.Clamp(bucketMinutes, 1, 10080);
            List<RequestHistoryEntry> rows = await _Db.RequestHistory.ListRangeAsync(fromUtc, toUtc, token).ConfigureAwait(false);
            RequestHistorySummary summary = new RequestHistorySummary
            {
                TotalCount = rows.Count,
                TotalSuccess = rows.Count(r => r.StatusCode < 400),
                TotalFailure = rows.Count(r => r.StatusCode >= 400),
                AverageDurationMs = rows.Count == 0 ? 0 : rows.Average(r => r.DurationMs)
            };
            TimeSpan width = TimeSpan.FromMinutes(bucketMinutes);
            int limit = 2000;
            for (DateTime start = fromUtc; start < toUtc && limit-- > 0; start += width)
            {
                DateTime end = start + width;
                List<RequestHistoryEntry> inBucket = rows.Where(r => r.CreatedUtc >= start && r.CreatedUtc < end).ToList();
                summary.Buckets.Add(new RequestHistoryBucket
                {
                    BucketStartUtc = start,
                    BucketEndUtc = end,
                    SuccessCount = inBucket.Count(r => r.StatusCode < 400),
                    FailureCount = inBucket.Count(r => r.StatusCode >= 400),
                    AverageDurationMs = inBucket.Count == 0 ? 0 : inBucket.Average(r => r.DurationMs)
                });
            }

            return summary;
        }

        #endregion

        #region Private-Methods

        // Only API traffic is recorded: the REST API (except the health probe), relayed machine traffic, and the tunnel
        // and events sockets. Dashboard files, the SPA shell, and anything else are not.
        private static bool ShouldCapture(string path, bool isRelay)
        {
            if (isRelay) return true;
            if (String.IsNullOrEmpty(path)) return false;
            if (path.Equals("/v1.0/api/health", StringComparison.OrdinalIgnoreCase)) return false;
            if (path.StartsWith("/v1.0/api/", StringComparison.OrdinalIgnoreCase)) return true;
            return path.Equals("/v1.0/tunnel", StringComparison.OrdinalIgnoreCase) || path.Equals("/v1.0/events", StringComparison.OrdinalIgnoreCase);
        }

        private static Dictionary<string, string> Redact(NameValueCollection? headers)
        {
            Dictionary<string, string> result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            if (headers == null) return result;
            foreach (string? key in headers.AllKeys)
            {
                if (String.IsNullOrEmpty(key)) continue;
                bool secret = _Redacted.Contains(key) || key.Contains("api-key", StringComparison.OrdinalIgnoreCase) || key.Contains("token", StringComparison.OrdinalIgnoreCase) || key.Contains("secret", StringComparison.OrdinalIgnoreCase);
                result[key] = secret ? "(redacted)" : headers[key] ?? String.Empty;
            }

            return result;
        }

        private static string Cap(string value, int max, out bool truncated)
        {
            truncated = false;
            if (String.IsNullOrEmpty(value) || max <= 0) return String.Empty;
            if (value.Length <= max) return value;
            truncated = true;
            return value.Substring(0, max);
        }

        private static string Truncate(string value, int max)
        {
            if (String.IsNullOrEmpty(value)) return String.Empty;
            return value.Length <= max ? value : value.Substring(0, max);
        }

        #endregion
    }
}
