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
    /// WebSocket tickets for the mobile app.
    /// </summary>
    public class TicketHandler
    {
        #region Private-Members

        private readonly MuxCloudServer _Server;

        #endregion

        #region Constructors-and-Factories

        /// <summary>
        /// Instantiate.
        /// </summary>
        /// <param name="server">Server.</param>
        public TicketHandler(MuxCloudServer server)
        {
            _Server = server ?? throw new ArgumentNullException(nameof(server));
        }

        #endregion

        #region Public-Methods

        /// <summary>
        /// POST /v1.0/api/ws-tickets.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        /// <param name="rc">Request context.</param>
        /// <returns>Task.</returns>
        /// <exception cref="ApiException">403 for cookie callers; browsers authenticate WebSockets with the cookie.</exception>
        public Task CreateAsync(HttpContextBase ctx, RequestContext rc)
        {
            AuthenticatedPrincipal principal = Api.RequireUser(rc);
            if (rc.AuthScheme != AuthSchemeEnum.Bearer) throw ApiException.Forbidden("Tickets are for bearer clients. Browsers authenticate WebSockets with the session cookie.");
            string ticket = _Server.Tickets.Issue(principal, out DateTime expires);
            return Api.SendJsonAsync(ctx, rc, 201, new WsTicketResponse { Ticket = ticket, ExpiresUtc = expires });
        }

        #endregion
    }
}
