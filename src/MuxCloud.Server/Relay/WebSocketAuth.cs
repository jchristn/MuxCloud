namespace MuxCloud.Server.Relay
{
    using System;
    using System.Threading.Tasks;
    using MuxCloud.Core;
    using MuxCloud.Core.Models;
    using MuxCloud.Server.Http;
    using MuxCloud.Server.Services;
    using WatsonWebserver.Core;

    /// <summary>
    /// Authenticates a browser or mobile WebSocket upgrade: a single-use ticket in ?ticket= (mobile), or the session cookie
    /// with an allowed Origin header (browser).
    /// Thread safety: stateless.
    /// </summary>
    public static class WebSocketAuth
    {
        #region Public-Methods

        /// <summary>
        /// Authenticate an upgrade.
        /// </summary>
        /// <param name="ctx">Upgrade context.</param>
        /// <param name="server">Server.</param>
        /// <returns>Request context with a principal, or null when authentication failed.</returns>
        public static async Task<RequestContext?> AuthenticateAsync(HttpContextBase ctx, MuxCloudServer server)
        {
            ArgumentNullException.ThrowIfNull(ctx);
            ArgumentNullException.ThrowIfNull(server);
            RequestContext rc = new RequestContext
            {
                SourceIp = RequestContextFactory.SourceIp(ctx, server),
                UserAgent = ctx.Request.Useragent ?? String.Empty,
                Origin = ctx.Request.RetrieveHeaderValue("Origin") ?? String.Empty
            };
            string? ticket = ctx.Request.RetrieveQueryValue("ticket");
            if (!String.IsNullOrEmpty(ticket))
            {
                TicketEntry? entry = server.Tickets.Redeem(ticket);
                if (entry == null) return null;
                AuthenticatedPrincipal? principal = await server.Accounts.ValidateSessionAsync(entry.TenantId, entry.UserId, entry.SessionId, ctx.Token).ConfigureAwait(false);
                if (principal == null) return null;
                rc.Principal = principal;
                rc.AuthScheme = AuthSchemeEnum.Ticket;
                return rc;
            }

            string? cookie = Cookies.Read(ctx.Request.RetrieveHeaderValue("Cookie"), Constants.SessionCookieName);
            if (cookie == null || !server.Origins.IsAllowed(rc.Origin)) return null;
            AuthenticatedPrincipal? fromCookie = await server.Accounts.ValidateAccessTokenAsync(cookie, ctx.Token).ConfigureAwait(false);
            if (fromCookie == null) return null;
            rc.Principal = fromCookie;
            rc.AuthScheme = AuthSchemeEnum.Cookie;
            return rc;
        }

        #endregion
    }
}
