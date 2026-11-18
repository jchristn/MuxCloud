namespace MuxCloud.Server.Routes
{
    using MuxCloud.Server.Handlers;
    using WatsonWebserver;
    using WatsonWebserver.Core;

    /// <summary>
    /// WebSocket tickets.
    /// </summary>
    public class TicketRoutes : RouteRegistrar
    {
        #region Constructors-and-Factories

        /// <summary>
        /// Instantiate.
        /// </summary>
        /// <param name="server">Server.</param>
        public TicketRoutes(MuxCloudServer server) : base(server)
        {
        }

        #endregion

        #region Public-Methods

        /// <inheritdoc />
        public override void Register(Webserver app)
        {
            TicketHandler h = new TicketHandler(Server);
            Add(app, HttpMethod.POST, "/v1.0/api/ws-tickets", true, "Tickets", "Issue a WebSocket ticket", h.CreateAsync, true);
        }

        #endregion
    }
}
