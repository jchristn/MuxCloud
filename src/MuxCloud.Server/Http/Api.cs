namespace MuxCloud.Server.Http
{
    using System;
    using System.Text;
    using System.Text.Json;
    using System.Threading;
    using System.Threading.Tasks;
    using MuxCloud.Core.Exceptions;
    using MuxCloud.Core.Models;
    using MuxCloud.Core.Responses;
    using WatsonWebserver.Core;

    /// <summary>
    /// The request pipeline every REST route runs through, plus response and request helpers. Exceptions map to status codes
    /// and the error body <c>{ "error": code, "message": text }</c>.
    /// Thread safety: stateless.
    /// </summary>
    public static class Api
    {
        #region Public-Methods

        /// <summary>
        /// Run a route body: build the request context, enforce the Origin rule for cookie-authenticated writes, and map
        /// exceptions to responses.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        /// <param name="server">Server.</param>
        /// <param name="body">Route body.</param>
        /// <returns>Task.</returns>
        public static async Task RunAsync(HttpContextBase ctx, MuxCloudServer server, Func<RequestContext, Task> body)
        {
            ArgumentNullException.ThrowIfNull(ctx);
            ArgumentNullException.ThrowIfNull(server);
            ArgumentNullException.ThrowIfNull(body);
            RequestContext rc = await RequestContextFactory.GetAsync(ctx, server).ConfigureAwait(false);
            try
            {
                if (rc.AuthScheme == AuthSchemeEnum.Cookie && !IsSafeMethod(ctx.Request.Method) && !server.Origins.IsAllowed(rc.Origin))
                {
                    throw new ApiException(403, "OriginNotAllowed", "Cookie-authenticated requests that change state must come from " + server.Settings.Server.PublicUrl + ".");
                }

                await body(rc).ConfigureAwait(false);
            }
            catch (ApiException e)
            {
                if (e.RetryAfterSeconds.HasValue) ctx.Response.Headers.Add("Retry-After", e.RetryAfterSeconds.Value.ToString(System.Globalization.CultureInfo.InvariantCulture));
                await SendErrorAsync(ctx, rc, e.StatusCode, e.ErrorCode, e.Message).ConfigureAwait(false);
            }
            catch (JsonException e)
            {
                await SendErrorAsync(ctx, rc, 400, "BadRequest", "The request body is not valid JSON: " + e.Message).ConfigureAwait(false);
            }
            catch (OperationCanceledException) when (ctx.Token.IsCancellationRequested)
            {
                // The client went away.
            }
            catch (Exception e)
            {
                server.LogError("unhandled " + ctx.Request.Method + " " + ctx.Request.Url.RawWithoutQuery + ": " + e);
                await SendErrorAsync(ctx, rc, 500, "InternalServerError", "An unexpected error occurred. Request " + rc.RequestId + ".").ConfigureAwait(false);
            }
        }

        /// <summary>
        /// Whether a method never changes state.
        /// </summary>
        /// <param name="method">Method.</param>
        /// <returns>True for GET, HEAD, and OPTIONS.</returns>
        public static bool IsSafeMethod(HttpMethod method)
        {
            return method == HttpMethod.GET || method == HttpMethod.HEAD || method == HttpMethod.OPTIONS;
        }

        /// <summary>
        /// Send a JSON response.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        /// <param name="rc">Request context (captures the body).</param>
        /// <param name="status">Status code.</param>
        /// <param name="value">Value.</param>
        /// <returns>Task.</returns>
        public static async Task SendJsonAsync(HttpContextBase ctx, RequestContext rc, int status, object? value)
        {
            if (ctx.Response.ResponseStarted) return;
            string json = ServerJson.Serialize(value);
            rc.CapturedResponseBody = json;
            ctx.Response.StatusCode = status;
            ctx.Response.ContentType = "application/json; charset=utf-8";
            ctx.Response.Headers.Add("Cache-Control", "no-store");
            await ctx.Response.Send(json, ctx.Token).ConfigureAwait(false);
        }

        /// <summary>
        /// Send an error response.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        /// <param name="rc">Request context.</param>
        /// <param name="status">Status code.</param>
        /// <param name="code">Stable error code.</param>
        /// <param name="message">Message.</param>
        /// <returns>Task.</returns>
        public static Task SendErrorAsync(HttpContextBase ctx, RequestContext rc, int status, string code, string message)
        {
            return SendJsonAsync(ctx, rc, status, new ErrorResponse { Error = code, Message = message });
        }

        /// <summary>
        /// Send 204 No Content.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        /// <returns>Task.</returns>
        public static async Task SendNoContentAsync(HttpContextBase ctx)
        {
            if (ctx.Response.ResponseStarted) return;
            ctx.Response.StatusCode = 204;
            await ctx.Response.Send(ctx.Token).ConfigureAwait(false);
        }

        /// <summary>
        /// Read and parse the request body.
        /// </summary>
        /// <typeparam name="T">Request type.</typeparam>
        /// <param name="ctx">HTTP context.</param>
        /// <param name="rc">Request context (captures the body unless capture is skipped).</param>
        /// <returns>Value.</returns>
        /// <exception cref="ApiException">400 for invalid JSON.</exception>
        public static T ReadJson<T>(HttpContextBase ctx, RequestContext rc) where T : class, new()
        {
            string body = ctx.Request.DataAsString ?? String.Empty;
            if (!rc.SkipBodyCapture) rc.CapturedRequestBody = body;
            return ServerJson.Deserialize<T>(body);
        }

        /// <summary>
        /// Require an authenticated caller.
        /// </summary>
        /// <param name="rc">Request context.</param>
        /// <returns>Principal.</returns>
        /// <exception cref="ApiException">401 Unauthorized.</exception>
        public static AuthenticatedPrincipal RequireUser(RequestContext rc)
        {
            if (rc.Principal == null) throw ApiException.Unauthorized();
            return rc.Principal;
        }

        /// <summary>
        /// Require a system administrator.
        /// </summary>
        /// <param name="rc">Request context.</param>
        /// <returns>Principal.</returns>
        /// <exception cref="ApiException">401 or 403.</exception>
        public static AuthenticatedPrincipal RequireAdmin(RequestContext rc)
        {
            AuthenticatedPrincipal principal = RequireUser(rc);
            if (!principal.User.IsAdmin) throw ApiException.Forbidden("Administrator access is required.");
            return principal;
        }

        /// <summary>
        /// Paging from the query string.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        /// <returns>Paging.</returns>
        public static PageRequest Page(HttpContextBase ctx)
        {
            PageRequest page = new PageRequest();
            if (Int32.TryParse(Query(ctx, "pageNumber"), out int number)) page.PageNumber = number;
            if (Int32.TryParse(Query(ctx, "pageSize"), out int size)) page.PageSize = size;
            return page;
        }

        /// <summary>
        /// A query string value.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        /// <param name="name">Name.</param>
        /// <returns>Value, or null.</returns>
        public static string? Query(HttpContextBase ctx, string name)
        {
            string? value = ctx.Request.RetrieveQueryValue(name);
            return String.IsNullOrEmpty(value) ? null : value;
        }

        /// <summary>
        /// A boolean query string value.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        /// <param name="name">Name.</param>
        /// <returns>Value, or null when absent or unparseable.</returns>
        public static bool? QueryBool(HttpContextBase ctx, string name)
        {
            return Boolean.TryParse(Query(ctx, name), out bool value) ? value : null;
        }

        /// <summary>
        /// A UTC timestamp query string value.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        /// <param name="name">Name.</param>
        /// <returns>Value, or null.</returns>
        /// <exception cref="ApiException">400 when present but invalid.</exception>
        public static DateTime? QueryUtc(HttpContextBase ctx, string name)
        {
            string? value = Query(ctx, name);
            if (value == null) return null;
            if (!DateTime.TryParse(value, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.AdjustToUniversal | System.Globalization.DateTimeStyles.AssumeUniversal, out DateTime parsed)) throw ApiException.BadRequest(name + " must be an ISO 8601 timestamp.");
            return DateTime.SpecifyKind(parsed, DateTimeKind.Utc);
        }

        /// <summary>
        /// A path parameter from the raw URL.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        /// <param name="template">Route template.</param>
        /// <param name="name">Parameter name.</param>
        /// <returns>Value.</returns>
        /// <exception cref="ApiException">404 when missing.</exception>
        public static string PathValue(HttpContextBase ctx, string template, string name)
        {
            if (PathParameters.Extract(template, ctx.Request.Url.RawWithoutQuery).TryGetValue(name, out string? value) && !String.IsNullOrEmpty(value)) return value;
            throw ApiException.NotFound("The resource");
        }

        #endregion
    }
}
