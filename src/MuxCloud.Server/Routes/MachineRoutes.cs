namespace MuxCloud.Server.Routes
{
    using MuxCloud.Server.Handlers;
    using WatsonWebserver;
    using WatsonWebserver.Core;

    /// <summary>
    /// Machine enrollment and management.
    /// </summary>
    public class MachineRoutes : RouteRegistrar
    {
        #region Constructors-and-Factories

        /// <summary>
        /// Instantiate.
        /// </summary>
        /// <param name="server">Server.</param>
        public MachineRoutes(MuxCloudServer server) : base(server)
        {
        }

        #endregion

        #region Public-Methods

        /// <inheritdoc />
        public override void Register(Webserver app)
        {
            MachineHandler h = new MachineHandler(Server);
            Add(app, HttpMethod.POST, "/v1.0/api/machines/enroll", false, "Machines", "Enroll a machine", h.EnrollAsync, true);
            Add(app, HttpMethod.POST, "/v1.0/api/machines/sign-out", false, "Machines", "A machine signs itself out", h.SignOutAsync, true);
            Add(app, HttpMethod.GET, "/v1.0/api/machines", true, "Machines", "List machines", h.ListAsync);
            Add(app, HttpMethod.GET, "/v1.0/api/machines/{id}", true, "Machines", "Read a machine", h.GetAsync);
            Add(app, HttpMethod.PUT, "/v1.0/api/machines/{id}", true, "Machines", "Rename a machine", h.RenameAsync);
            Add(app, HttpMethod.DELETE, "/v1.0/api/machines/{id}", true, "Machines", "Delete a machine", h.DeleteAsync);
            Add(app, HttpMethod.POST, "/v1.0/api/machines/{id}/revoke", true, "Machines", "Revoke a machine", h.RevokeAsync);
            Add(app, HttpMethod.GET, "/v1.0/api/machines/{id}/connections", true, "Machines", "Connection history", h.ConnectionsAsync);
        }

        #endregion
    }
}
