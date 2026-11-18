namespace MuxCloud.Server.Routes
{
    using MuxCloud.Server.Handlers;
    using WatsonWebserver;
    using WatsonWebserver.Core;

    /// <summary>
    /// Push device registration for the mobile app.
    /// </summary>
    public class DeviceRoutes : RouteRegistrar
    {
        #region Constructors-and-Factories

        /// <summary>
        /// Instantiate.
        /// </summary>
        /// <param name="server">Server.</param>
        public DeviceRoutes(MuxCloudServer server) : base(server)
        {
        }

        #endregion

        #region Public-Methods

        /// <inheritdoc />
        public override void Register(Webserver app)
        {
            DeviceHandler h = new DeviceHandler(Server);
            Add(app, HttpMethod.POST, "/v1.0/api/devices", true, "Devices", "Register a push device", h.RegisterAsync, true);
            Add(app, HttpMethod.GET, "/v1.0/api/devices", true, "Devices", "List push devices", h.ListAsync);
            Add(app, HttpMethod.DELETE, "/v1.0/api/devices/{id}", true, "Devices", "Remove a push device", h.DeleteAsync);
        }

        #endregion
    }
}
