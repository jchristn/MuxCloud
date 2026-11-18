namespace MuxCloud.Server.Handlers
{
    using System;
    using System.Threading.Tasks;
    using MuxCloud.Core.Exceptions;
    using MuxCloud.Core.Models;
    using MuxCloud.Core.Responses;
    using MuxCloud.Server.Http;
    using WatsonWebserver.Core;

    /// <summary>
    /// Request history (administrators). Relay requests never carry bodies.
    /// </summary>
    public class RequestHistoryHandler
    {
        #region Private-Members

        private readonly MuxCloudServer _Server;

        #endregion

        #region Constructors-and-Factories

        /// <summary>
        /// Instantiate.
        /// </summary>
        /// <param name="server">Server.</param>
        public RequestHistoryHandler(MuxCloudServer server)
        {
            _Server = server ?? throw new ArgumentNullException(nameof(server));
        }

        #endregion

        #region Public-Methods

        /// <summary>
        /// GET /v1.0/api/request-history.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        /// <param name="rc">Request context.</param>
        /// <returns>Task.</returns>
        public async Task ListAsync(HttpContextBase ctx, RequestContext rc)
        {
            Api.RequireAdmin(rc);
            if (!_Server.Settings.RequestHistory.Enabled)
            {
                await Api.SendJsonAsync(ctx, rc, 200, new PagedResult<RequestHistoryEntry>()).ConfigureAwait(false);
                return;
            }

            PagedResult<RequestHistoryEntry> page = await _Server.Database.RequestHistory.EnumerateAsync(Filter(ctx), Api.Page(ctx), ctx.Token).ConfigureAwait(false);
            await Api.SendJsonAsync(ctx, rc, 200, page).ConfigureAwait(false);
        }

        /// <summary>
        /// GET /v1.0/api/request-history/summary.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        /// <param name="rc">Request context.</param>
        /// <returns>Task.</returns>
        /// <exception cref="ApiException">400 when fromUtc, toUtc, or bucketMinutes is missing or invalid.</exception>
        public async Task SummaryAsync(HttpContextBase ctx, RequestContext rc)
        {
            Api.RequireAdmin(rc);
            DateTime from = Api.QueryUtc(ctx, "fromUtc") ?? throw ApiException.BadRequest("fromUtc is required.");
            DateTime to = Api.QueryUtc(ctx, "toUtc") ?? throw ApiException.BadRequest("toUtc is required.");
            if (!Int32.TryParse(Api.Query(ctx, "bucketMinutes"), out int bucket) || bucket < 1) throw ApiException.BadRequest("bucketMinutes must be a positive integer.");
            if (to <= from) throw ApiException.BadRequest("toUtc must be after fromUtc.");
            RequestHistorySummary summary = await _Server.RequestHistory.SummarizeAsync(from, to, bucket, ctx.Token).ConfigureAwait(false);
            await Api.SendJsonAsync(ctx, rc, 200, summary).ConfigureAwait(false);
        }

        /// <summary>
        /// GET /v1.0/api/request-history/{id}.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        /// <param name="rc">Request context.</param>
        /// <returns>Task.</returns>
        /// <exception cref="ApiException">404.</exception>
        public async Task GetAsync(HttpContextBase ctx, RequestContext rc)
        {
            Api.RequireAdmin(rc);
            string id = Api.PathValue(ctx, "/v1.0/api/request-history/{id}", "id");
            RequestHistoryEntry entry = await _Server.Database.RequestHistory.ReadAsync(id, ctx.Token).ConfigureAwait(false) ?? throw ApiException.NotFound("Request");
            await Api.SendJsonAsync(ctx, rc, 200, entry).ConfigureAwait(false);
        }

        /// <summary>
        /// DELETE /v1.0/api/request-history/{id}.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        /// <param name="rc">Request context.</param>
        /// <returns>Task.</returns>
        /// <exception cref="ApiException">404.</exception>
        public async Task DeleteAsync(HttpContextBase ctx, RequestContext rc)
        {
            Api.RequireAdmin(rc);
            string id = Api.PathValue(ctx, "/v1.0/api/request-history/{id}", "id");
            if (!await _Server.Database.RequestHistory.DeleteAsync(id, ctx.Token).ConfigureAwait(false)) throw ApiException.NotFound("Request");
            await Api.SendNoContentAsync(ctx).ConfigureAwait(false);
        }

        /// <summary>
        /// DELETE /v1.0/api/request-history.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        /// <param name="rc">Request context.</param>
        /// <returns>Task.</returns>
        public async Task DeleteByFilterAsync(HttpContextBase ctx, RequestContext rc)
        {
            Api.RequireAdmin(rc);
            int deleted = await _Server.Database.RequestHistory.DeleteByFilterAsync(Filter(ctx), ctx.Token).ConfigureAwait(false);
            await Api.SendJsonAsync(ctx, rc, 200, new DeletedCountResponse { DeletedCount = deleted }).ConfigureAwait(false);
        }

        #endregion

        #region Private-Methods

        private static RequestHistoryFilter Filter(HttpContextBase ctx)
        {
            return new RequestHistoryFilter
            {
                Method = Api.Query(ctx, "method"),
                StatusCode = Int32.TryParse(Api.Query(ctx, "statusCode"), out int status) ? status : null,
                PathContains = Api.Query(ctx, "pathContains"),
                UserId = Api.Query(ctx, "userId"),
                TenantId = Api.Query(ctx, "tenantId"),
                FromUtc = Api.QueryUtc(ctx, "fromUtc"),
                ToUtc = Api.QueryUtc(ctx, "toUtc")
            };
        }

        #endregion
    }
}
