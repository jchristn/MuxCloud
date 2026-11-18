namespace MuxCloud.Server.Routes
{
    using MuxCloud.Server.Handlers;
    using WatsonWebserver;
    using WatsonWebserver.Core;

    /// <summary>
    /// Request history (administrators).
    /// </summary>
    public class RequestHistoryRoutes : RouteRegistrar
    {
        #region Constructors-and-Factories

        /// <summary>
        /// Instantiate.
        /// </summary>
        /// <param name="server">Server.</param>
        public RequestHistoryRoutes(MuxCloudServer server) : base(server)
        {
        }

        #endregion

        #region Public-Methods

        /// <inheritdoc />
        public override void Register(Webserver app)
        {
            RequestHistoryHandler h = new RequestHistoryHandler(Server);
            Add(app, HttpMethod.GET, "/v1.0/api/request-history", true, "RequestHistory", "List requests", h.ListAsync);
            Add(app, HttpMethod.GET, "/v1.0/api/request-history/summary", true, "RequestHistory", "Summarize requests", h.SummaryAsync);
            Add(app, HttpMethod.GET, "/v1.0/api/request-history/{id}", true, "RequestHistory", "Read a request", h.GetAsync);
            Add(app, HttpMethod.DELETE, "/v1.0/api/request-history/{id}", true, "RequestHistory", "Delete a request", h.DeleteAsync);
            Add(app, HttpMethod.DELETE, "/v1.0/api/request-history", true, "RequestHistory", "Delete requests by filter", h.DeleteByFilterAsync);
        }

        #endregion
    }
}
