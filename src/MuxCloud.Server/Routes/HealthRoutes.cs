namespace MuxCloud.Server.Routes
{
    using MuxCloud.Server.Handlers;
    using WatsonWebserver;
    using WatsonWebserver.Core;

    /// <summary>
    /// Health routes.
    /// </summary>
    public class HealthRoutes : RouteRegistrar
    {
        #region Constructors-and-Factories

        /// <summary>
        /// Instantiate.
        /// </summary>
        /// <param name="server">Server.</param>
        public HealthRoutes(MuxCloudServer server) : base(server)
        {
        }

        #endregion

        #region Public-Methods

        /// <inheritdoc />
        public override void Register(Webserver app)
        {
            HealthHandler h = new HealthHandler(Server);
            Add(app, HttpMethod.GET, "/v1.0/api/health", false, "Health", "Health check", h.HealthAsync);
        }

        #endregion
    }
}
