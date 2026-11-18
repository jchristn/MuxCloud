namespace MuxCloud.Server.Http
{
    using System;
    using System.Threading.Tasks;
    using MuxCloud.Core;
    using MuxCloud.Core.Models;
    using WatsonWebserver.Core;

    /// <summary>
    /// Builds the <see cref="RequestContext"/> once per request (from the AuthenticateRequest hook or the first route that
    /// asks) and caches it in <c>HttpContextBase.Metadata</c>. Exactly one scheme is used: a non-empty bearer token, else
    /// the session cookie. An invalid credential leaves the request anonymous; routes that need a caller return 401.
    /// Thread safety: stateless.
    /// </summary>
    public static class RequestContextFactory
    {
        #region Public-Methods

        /// <summary>
        /// Get or build the request context.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        /// <param name="server">Server.</param>
        /// <returns>Context.</returns>
        public static async Task<RequestContext> GetAsync(HttpContextBase ctx, MuxCloudServer server)
        {
            ArgumentNullException.ThrowIfNull(ctx);
            ArgumentNullException.ThrowIfNull(server);
            if (ctx.Metadata is RequestContext existing) return existing;
            RequestContext rc = new RequestContext
            {
                SourceIp = SourceIp(ctx, server),
                UserAgent = ctx.Request.Useragent ?? String.Empty,
                Origin = ctx.Request.RetrieveHeaderValue("Origin") ?? String.Empty
            };
            ctx.Metadata = rc;
            string? bearer = Bearer(ctx);
            if (bearer != null)
            {
                AuthenticatedPrincipal? principal = await server.Accounts.ValidateAccessTokenAsync(bearer, ctx.Token).ConfigureAwait(false);
                if (principal != null)
                {
                    rc.Principal = principal;
                    rc.AuthScheme = AuthSchemeEnum.Bearer;
                }

                return rc;
            }

            string? cookie = Cookies.Read(ctx.Request.RetrieveHeaderValue("Cookie"), Constants.SessionCookieName);
            if (cookie != null)
            {
                AuthenticatedPrincipal? principal = await server.Accounts.ValidateAccessTokenAsync(cookie, ctx.Token).ConfigureAwait(false);
                if (principal != null)
                {
                    rc.Principal = principal;
                    rc.AuthScheme = AuthSchemeEnum.Cookie;
                }
            }

            return rc;
        }

        /// <summary>
        /// The bearer token, or null when absent or empty.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        /// <returns>Token or null.</returns>
        public static string? Bearer(HttpContextBase ctx)
        {
            string? header = ctx.Request.RetrieveHeaderValue("Authorization");
            if (String.IsNullOrWhiteSpace(header) || !header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)) return null;
            string value = header.Substring(7).Trim();
            return value.Length == 0 ? null : value;
        }

        /// <summary>
        /// The requester IP, honoring X-Forwarded-For only when configured to.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        /// <param name="server">Server.</param>
        /// <returns>IP.</returns>
        public static string SourceIp(HttpContextBase ctx, MuxCloudServer server)
        {
            if (server.Settings.Server.TrustForwardedHeaders)
            {
                string? forwarded = ctx.Request.RetrieveHeaderValue("X-Forwarded-For");
                if (!String.IsNullOrWhiteSpace(forwarded)) return forwarded.Split(',')[0].Trim();
            }

            return ctx.Request.Source?.IpAddress ?? String.Empty;
        }

        #endregion
    }
}
