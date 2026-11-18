namespace MuxCloud.Server.Handlers
{
    using System;
    using System.Threading.Tasks;
    using MuxCloud.Core.Models;
    using MuxCloud.Core.Requests;
    using MuxCloud.Core.Responses;
    using MuxCloud.Server.Http;
    using WatsonWebserver.Core;

    /// <summary>
    /// The current user's profile, password, sessions, and account deletion.
    /// </summary>
    public class AccountHandler
    {
        #region Private-Members

        private readonly MuxCloudServer _Server;

        #endregion

        #region Constructors-and-Factories

        /// <summary>
        /// Instantiate.
        /// </summary>
        /// <param name="server">Server.</param>
        public AccountHandler(MuxCloudServer server)
        {
            _Server = server ?? throw new ArgumentNullException(nameof(server));
        }

        #endregion

        #region Public-Methods

        /// <summary>
        /// GET /v1.0/api/account.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        /// <param name="rc">Request context.</param>
        /// <returns>Task.</returns>
        public Task GetAsync(HttpContextBase ctx, RequestContext rc)
        {
            AuthenticatedPrincipal principal = Api.RequireUser(rc);
            return Api.SendJsonAsync(ctx, rc, 200, DtoMapper.ToDto(principal.User));
        }

        /// <summary>
        /// PUT /v1.0/api/account.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        /// <param name="rc">Request context.</param>
        /// <returns>Task.</returns>
        public async Task UpdateAsync(HttpContextBase ctx, RequestContext rc)
        {
            AuthenticatedPrincipal principal = Api.RequireUser(rc);
            UpdateProfileRequest request = Api.ReadJson<UpdateProfileRequest>(ctx, rc);
            User user = await _Server.Accounts.UpdateProfileAsync(principal.User, request.FirstName, request.LastName, ctx.Token).ConfigureAwait(false);
            await Api.SendJsonAsync(ctx, rc, 200, DtoMapper.ToDto(user)).ConfigureAwait(false);
        }

        /// <summary>
        /// POST /v1.0/api/account/password.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        /// <param name="rc">Request context.</param>
        /// <returns>Task.</returns>
        public async Task PasswordAsync(HttpContextBase ctx, RequestContext rc)
        {
            AuthenticatedPrincipal principal = Api.RequireUser(rc);
            ChangePasswordRequest request = Api.ReadJson<ChangePasswordRequest>(ctx, rc);
            await _Server.Accounts.ChangePasswordAsync(principal, request.CurrentPassword, request.NewPassword, ctx.Token).ConfigureAwait(false);
            await Api.SendNoContentAsync(ctx).ConfigureAwait(false);
        }

        /// <summary>
        /// GET /v1.0/api/account/sessions.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        /// <param name="rc">Request context.</param>
        /// <returns>Task.</returns>
        public async Task SessionsAsync(HttpContextBase ctx, RequestContext rc)
        {
            AuthenticatedPrincipal principal = Api.RequireUser(rc);
            PagedResult<AuthSession> page = await _Server.Accounts.ListSessionsAsync(principal.User, Api.Page(ctx), ctx.Token).ConfigureAwait(false);
            await Api.SendJsonAsync(ctx, rc, 200, page.Map((AuthSession s) => DtoMapper.ToDto(s, principal.Session.Id))).ConfigureAwait(false);
        }

        /// <summary>
        /// DELETE /v1.0/api/account/sessions/{id}.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        /// <param name="rc">Request context.</param>
        /// <returns>Task.</returns>
        public async Task RevokeSessionAsync(HttpContextBase ctx, RequestContext rc)
        {
            AuthenticatedPrincipal principal = Api.RequireUser(rc);
            string id = Api.PathValue(ctx, "/v1.0/api/account/sessions/{id}", "id");
            await _Server.Accounts.RevokeSessionAsync(principal.User, id, ctx.Token).ConfigureAwait(false);
            await Api.SendNoContentAsync(ctx).ConfigureAwait(false);
        }

        /// <summary>
        /// DELETE /v1.0/api/account.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        /// <param name="rc">Request context.</param>
        /// <returns>Task.</returns>
        public async Task DeleteAsync(HttpContextBase ctx, RequestContext rc)
        {
            AuthenticatedPrincipal principal = Api.RequireUser(rc);
            PasswordConfirmRequest request = Api.ReadJson<PasswordConfirmRequest>(ctx, rc);
            await _Server.Accounts.DeleteOwnAccountAsync(principal, request.Password, _Server.Machines, ctx.Token).ConfigureAwait(false);
            foreach (string cookie in Cookies.Clear(_Server.Origins.SecureCookies)) ctx.Response.Headers.Add("Set-Cookie", cookie);
            await Api.SendNoContentAsync(ctx).ConfigureAwait(false);
        }

        #endregion
    }
}
