namespace MuxCloud.Server.Routes
{
    using MuxCloud.Server.Handlers;
    using WatsonWebserver;
    using WatsonWebserver.Core;

    /// <summary>
    /// System administration.
    /// </summary>
    public class AdminRoutes : RouteRegistrar
    {
        #region Constructors-and-Factories

        /// <summary>
        /// Instantiate.
        /// </summary>
        /// <param name="server">Server.</param>
        public AdminRoutes(MuxCloudServer server) : base(server)
        {
        }

        #endregion

        #region Public-Methods

        /// <inheritdoc />
        public override void Register(Webserver app)
        {
            AdminHandler h = new AdminHandler(Server);
            Add(app, HttpMethod.GET, "/v1.0/api/admin/stats", true, "Admin", "Service statistics", h.StatsAsync);
            Add(app, HttpMethod.GET, "/v1.0/api/admin/users", true, "Admin", "List users", h.UsersAsync);
            // The password routes are registered before the {id} routes so the longer paths match first.
            Add(app, HttpMethod.PUT, "/v1.0/api/admin/users/{id}/password", true, "Admin", "Set a user's password (no email)", h.SetUserPasswordAsync);
            Add(app, HttpMethod.POST, "/v1.0/api/admin/users/{id}/password-reset", true, "Admin", "Email a user a password reset link", h.SendUserPasswordResetAsync);
            Add(app, HttpMethod.GET, "/v1.0/api/admin/users/{id}", true, "Admin", "Read a user", h.UserAsync);
            Add(app, HttpMethod.PUT, "/v1.0/api/admin/users/{id}", true, "Admin", "Update a user", h.UpdateUserAsync);
            Add(app, HttpMethod.DELETE, "/v1.0/api/admin/users/{id}", true, "Admin", "Delete a user", h.DeleteUserAsync);
            Add(app, HttpMethod.GET, "/v1.0/api/admin/machines", true, "Admin", "List all machines", h.MachinesAsync);
            Add(app, HttpMethod.GET, "/v1.0/api/admin/plans", true, "Admin", "List all plans", h.PlansAsync);
            Add(app, HttpMethod.POST, "/v1.0/api/admin/plans", true, "Admin", "Create a plan", h.CreatePlanAsync);
            Add(app, HttpMethod.PUT, "/v1.0/api/admin/plans/{id}", true, "Admin", "Update a plan", h.UpdatePlanAsync);
            Add(app, HttpMethod.GET, "/v1.0/api/admin/accounts/{accountId}/overrides", true, "Admin", "List entitlement overrides", h.OverridesAsync);
            Add(app, HttpMethod.POST, "/v1.0/api/admin/accounts/{accountId}/overrides", true, "Admin", "Create an entitlement override", h.CreateOverrideAsync);
            Add(app, HttpMethod.DELETE, "/v1.0/api/admin/accounts/{accountId}/overrides/{id}", true, "Admin", "Delete an entitlement override", h.DeleteOverrideAsync);
            Add(app, HttpMethod.GET, "/v1.0/api/admin/audit", true, "Admin", "Audit records", h.AuditAsync);
            Add(app, HttpMethod.GET, "/v1.0/api/admin/settings", true, "Admin", "Effective settings (secrets masked)", h.SettingsAsync);
            Add(app, HttpMethod.POST, "/v1.0/api/admin/email/test", true, "Admin", "Send a test email", h.EmailTestAsync);
        }

        #endregion
    }
}
