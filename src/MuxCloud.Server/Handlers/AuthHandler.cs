namespace MuxCloud.Server.Handlers
{
    using System;
    using System.Threading.Tasks;
    using MuxCloud.Core;
    using MuxCloud.Core.Exceptions;
    using MuxCloud.Core.Models;
    using MuxCloud.Core.Requests;
    using MuxCloud.Core.Responses;
    using MuxCloud.Server.Http;
    using WatsonWebserver.Core;

    /// <summary>
    /// Sign up, verification, sign in, refresh, sign out, password reset, and the current user.
    /// </summary>
    public class AuthHandler
    {
        #region Private-Members

        private readonly MuxCloudServer _Server;

        #endregion

        #region Constructors-and-Factories

        /// <summary>
        /// Instantiate.
        /// </summary>
        /// <param name="server">Server.</param>
        public AuthHandler(MuxCloudServer server)
        {
            _Server = server ?? throw new ArgumentNullException(nameof(server));
        }

        #endregion

        #region Public-Methods

        /// <summary>
        /// POST /v1.0/api/auth/signup.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        /// <param name="rc">Request context.</param>
        /// <returns>Task.</returns>
        public async Task SignupAsync(HttpContextBase ctx, RequestContext rc)
        {
            SignupRequest request = Api.ReadJson<SignupRequest>(ctx, rc);
            User user = await _Server.Accounts.SignupAsync(request, rc.SourceIp, ctx.Token).ConfigureAwait(false);
            await Api.SendJsonAsync(ctx, rc, 201, new SignupResponse { UserId = user.Id, Email = user.Email, Status = user.EmailVerifiedUtc == null ? "pending_verification" : "active" }).ConfigureAwait(false);
        }

        /// <summary>
        /// POST /v1.0/api/auth/verify.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        /// <param name="rc">Request context.</param>
        /// <returns>Task.</returns>
        public async Task VerifyAsync(HttpContextBase ctx, RequestContext rc)
        {
            TokenRequest request = Api.ReadJson<TokenRequest>(ctx, rc);
            User user = await _Server.Accounts.VerifyEmailAsync(request.Token, ctx.Token).ConfigureAwait(false);
            await Api.SendJsonAsync(ctx, rc, 200, new VerifiedResponse { Email = user.Email }).ConfigureAwait(false);
        }

        /// <summary>
        /// POST /v1.0/api/auth/verify/resend.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        /// <param name="rc">Request context.</param>
        /// <returns>Task.</returns>
        public async Task ResendAsync(HttpContextBase ctx, RequestContext rc)
        {
            EmailRequest request = Api.ReadJson<EmailRequest>(ctx, rc);
            await _Server.Accounts.ResendVerificationAsync(request.Email, rc.SourceIp, ctx.Token).ConfigureAwait(false);
            await Api.SendJsonAsync(ctx, rc, 202, new AcceptedResponse()).ConfigureAwait(false);
        }

        /// <summary>
        /// POST /v1.0/api/auth/login.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        /// <param name="rc">Request context.</param>
        /// <returns>Task.</returns>
        public async Task LoginAsync(HttpContextBase ctx, RequestContext rc)
        {
            LoginRequest request = Api.ReadJson<LoginRequest>(ctx, rc);
            LoginResult result = await _Server.Accounts.LoginAsync(request, rc.SourceIp, rc.UserAgent, ctx.Token).ConfigureAwait(false);
            await SendLoginAsync(ctx, rc, result, String.Equals(result.Session.Client, "mobile", StringComparison.Ordinal)).ConfigureAwait(false);
        }

        /// <summary>
        /// POST /v1.0/api/auth/refresh.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        /// <param name="rc">Request context.</param>
        /// <returns>Task.</returns>
        /// <exception cref="ApiException">403 when a cookie refresh comes from a disallowed origin.</exception>
        public async Task RefreshAsync(HttpContextBase ctx, RequestContext rc)
        {
            RefreshRequest request = Api.ReadJson<RefreshRequest>(ctx, rc);
            bool fromBody = !String.IsNullOrWhiteSpace(request.RefreshToken);
            string? token = fromBody ? request.RefreshToken : Cookies.Read(ctx.Request.RetrieveHeaderValue("Cookie"), Constants.RefreshCookieName);
            if (!fromBody && !_Server.Origins.IsAllowed(rc.Origin)) throw new ApiException(403, "OriginNotAllowed", "Cookie refreshes must come from " + _Server.Settings.Server.PublicUrl + ".");
            LoginResult result = await _Server.Accounts.RefreshAsync(token, rc.SourceIp, ctx.Token).ConfigureAwait(false);
            await SendLoginAsync(ctx, rc, result, fromBody).ConfigureAwait(false);
        }

        /// <summary>
        /// POST /v1.0/api/auth/logout.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        /// <param name="rc">Request context.</param>
        /// <returns>Task.</returns>
        public async Task LogoutAsync(HttpContextBase ctx, RequestContext rc)
        {
            AuthenticatedPrincipal principal = Api.RequireUser(rc);
            await _Server.Accounts.RevokeSessionAsync(principal.Session, "signed out", ctx.Token).ConfigureAwait(false);
            foreach (string cookie in Cookies.Clear(_Server.Origins.SecureCookies)) ctx.Response.Headers.Add("Set-Cookie", cookie);
            await Api.SendNoContentAsync(ctx).ConfigureAwait(false);
        }

        /// <summary>
        /// POST /v1.0/api/auth/password/forgot.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        /// <param name="rc">Request context.</param>
        /// <returns>Task.</returns>
        public async Task ForgotAsync(HttpContextBase ctx, RequestContext rc)
        {
            EmailRequest request = Api.ReadJson<EmailRequest>(ctx, rc);
            await _Server.Accounts.ForgotPasswordAsync(request.Email, rc.SourceIp, ctx.Token).ConfigureAwait(false);
            await Api.SendJsonAsync(ctx, rc, 202, new AcceptedResponse()).ConfigureAwait(false);
        }

        /// <summary>
        /// POST /v1.0/api/auth/password/reset.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        /// <param name="rc">Request context.</param>
        /// <returns>Task.</returns>
        public async Task ResetAsync(HttpContextBase ctx, RequestContext rc)
        {
            ResetPasswordRequest request = Api.ReadJson<ResetPasswordRequest>(ctx, rc);
            await _Server.Accounts.ResetPasswordAsync(request.Token, request.Password, ctx.Token).ConfigureAwait(false);
            await Api.SendJsonAsync(ctx, rc, 200, new ResetResponse()).ConfigureAwait(false);
        }

        /// <summary>
        /// GET /v1.0/api/auth/me.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        /// <param name="rc">Request context.</param>
        /// <returns>Task.</returns>
        public async Task MeAsync(HttpContextBase ctx, RequestContext rc)
        {
            AuthenticatedPrincipal principal = Api.RequireUser(rc);
            EffectiveEntitlements entitlements = await _Server.Entitlements.GetAsync(principal.User.AccountId, ctx.Token).ConfigureAwait(false);
            await Api.SendJsonAsync(ctx, rc, 200, new MeResponse { User = DtoMapper.ToDto(principal.User), SessionId = principal.Session.Id, Entitlements = entitlements }).ConfigureAwait(false);
        }

        #endregion

        #region Private-Methods

        private async Task SendLoginAsync(HttpContextBase ctx, RequestContext rc, LoginResult result, bool tokensInBody)
        {
            LoginResponse response = new LoginResponse
            {
                SessionId = result.Session.Id,
                User = DtoMapper.ToDto(result.User),
                AccessTokenExpiresUtc = result.AccessTokenExpiresUtc,
                RefreshTokenExpiresUtc = result.RefreshTokenExpiresUtc
            };
            if (tokensInBody)
            {
                response.AccessToken = result.AccessToken;
                response.RefreshToken = result.RefreshToken;
            }
            else
            {
                bool secure = _Server.Origins.SecureCookies;
                ctx.Response.Headers.Add("Set-Cookie", Cookies.Session(result.AccessToken, (int)Math.Max(0, (result.AccessTokenExpiresUtc - DateTime.UtcNow).TotalSeconds), secure));
                ctx.Response.Headers.Add("Set-Cookie", Cookies.Refresh(result.RefreshToken, (int)Math.Max(0, (result.RefreshTokenExpiresUtc - DateTime.UtcNow).TotalSeconds), secure));
            }

            await Api.SendJsonAsync(ctx, rc, 200, response).ConfigureAwait(false);
        }

        #endregion
    }
}
