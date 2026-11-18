namespace MuxCloud.Server.Routes
{
    using MuxCloud.Server.Handlers;
    using WatsonWebserver;
    using WatsonWebserver.Core;

    /// <summary>
    /// The current user's profile, password, sessions, and account deletion.
    /// </summary>
    public class AccountRoutes : RouteRegistrar
    {
        #region Constructors-and-Factories

        /// <summary>
        /// Instantiate.
        /// </summary>
        /// <param name="server">Server.</param>
        public AccountRoutes(MuxCloudServer server) : base(server)
        {
        }

        #endregion

        #region Public-Methods

        /// <inheritdoc />
        public override void Register(Webserver app)
        {
            AccountHandler h = new AccountHandler(Server);
            Add(app, HttpMethod.GET, "/v1.0/api/account", true, "Account", "Read profile", h.GetAsync);
            Add(app, HttpMethod.PUT, "/v1.0/api/account", true, "Account", "Update profile", h.UpdateAsync);
            Add(app, HttpMethod.DELETE, "/v1.0/api/account", true, "Account", "Delete account", h.DeleteAsync, true);
            Add(app, HttpMethod.POST, "/v1.0/api/account/password", true, "Account", "Change password", h.PasswordAsync, true);
            Add(app, HttpMethod.GET, "/v1.0/api/account/sessions", true, "Account", "List sessions", h.SessionsAsync);
            Add(app, HttpMethod.DELETE, "/v1.0/api/account/sessions/{id}", true, "Account", "Revoke a session", h.RevokeSessionAsync);
        }

        #endregion
    }
}
