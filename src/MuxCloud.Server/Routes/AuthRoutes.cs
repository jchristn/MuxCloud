namespace MuxCloud.Server.Routes
{
    using MuxCloud.Server.Handlers;
    using WatsonWebserver;
    using WatsonWebserver.Core;

    /// <summary>
    /// Sign up, verification, sign in, refresh, sign out, password reset, and the current user.
    /// </summary>
    public class AuthRoutes : RouteRegistrar
    {
        #region Constructors-and-Factories

        /// <summary>
        /// Instantiate.
        /// </summary>
        /// <param name="server">Server.</param>
        public AuthRoutes(MuxCloudServer server) : base(server)
        {
        }

        #endregion

        #region Public-Methods

        /// <inheritdoc />
        public override void Register(Webserver app)
        {
            AuthHandler h = new AuthHandler(Server);
            Add(app, HttpMethod.POST, "/v1.0/api/auth/signup", false, "Auth", "Sign up", h.SignupAsync, true);
            Add(app, HttpMethod.POST, "/v1.0/api/auth/verify", false, "Auth", "Verify email", h.VerifyAsync, true);
            Add(app, HttpMethod.POST, "/v1.0/api/auth/verify/resend", false, "Auth", "Resend verification email", h.ResendAsync);
            Add(app, HttpMethod.POST, "/v1.0/api/auth/login", false, "Auth", "Sign in", h.LoginAsync, true);
            Add(app, HttpMethod.POST, "/v1.0/api/auth/refresh", false, "Auth", "Rotate the refresh token", h.RefreshAsync, true);
            Add(app, HttpMethod.POST, "/v1.0/api/auth/logout", true, "Auth", "Sign out", h.LogoutAsync);
            Add(app, HttpMethod.POST, "/v1.0/api/auth/password/forgot", false, "Auth", "Email a password reset link", h.ForgotAsync);
            Add(app, HttpMethod.POST, "/v1.0/api/auth/password/reset", false, "Auth", "Reset a password", h.ResetAsync, true);
            Add(app, HttpMethod.GET, "/v1.0/api/auth/me", true, "Auth", "Current user and entitlements", h.MeAsync);
        }

        #endregion
    }
}
