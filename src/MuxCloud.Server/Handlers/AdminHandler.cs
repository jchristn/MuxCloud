namespace MuxCloud.Server.Handlers
{
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Text.Json;
    using System.Threading.Tasks;
    using MuxCloud.Core;
    using MuxCloud.Core.Exceptions;
    using MuxCloud.Core.Models;
    using MuxCloud.Core.Requests;
    using MuxCloud.Core.Responses;
    using MuxCloud.Core.Settings;
    using MuxCloud.Server.Http;
    using WatsonWebserver.Core;

    /// <summary>
    /// System administration. Every route requires a system administrator.
    /// </summary>
    public class AdminHandler
    {
        #region Private-Members

        private readonly MuxCloudServer _Server;

        #endregion

        #region Constructors-and-Factories

        /// <summary>
        /// Instantiate.
        /// </summary>
        /// <param name="server">Server.</param>
        public AdminHandler(MuxCloudServer server)
        {
            _Server = server ?? throw new ArgumentNullException(nameof(server));
        }

        #endregion

        #region Public-Methods

        /// <summary>
        /// GET /v1.0/api/admin/stats.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        /// <param name="rc">Request context.</param>
        /// <returns>Task.</returns>
        public async Task StatsAsync(HttpContextBase ctx, RequestContext rc)
        {
            Api.RequireAdmin(rc);
            AdminStatsResponse stats = new AdminStatsResponse
            {
                Users = await _Server.Database.Users.CountAsync(ctx.Token).ConfigureAwait(false),
                Machines = await _Server.Database.Machines.CountAsync(ctx.Token).ConfigureAwait(false),
                OnlineMachines = _Server.Registry.Count,
                LiveConnections = _Server.Registry.Count,
                RelayStreams = _Server.Registry.OpenStreams,
                EventSubscribers = _Server.Events.Count
            };
            await Api.SendJsonAsync(ctx, rc, 200, stats).ConfigureAwait(false);
        }

        /// <summary>
        /// GET /v1.0/api/admin/users.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        /// <param name="rc">Request context.</param>
        /// <returns>Task.</returns>
        public async Task UsersAsync(HttpContextBase ctx, RequestContext rc)
        {
            Api.RequireAdmin(rc);
            PagedResult<User> page = await _Server.Database.Users.EnumerateAsync(Api.Query(ctx, "email"), Api.Page(ctx), ctx.Token).ConfigureAwait(false);
            await Api.SendJsonAsync(ctx, rc, 200, page.Map(DtoMapper.ToDto)).ConfigureAwait(false);
        }

        /// <summary>
        /// GET /v1.0/api/admin/users/{id}.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        /// <param name="rc">Request context.</param>
        /// <returns>Task.</returns>
        public async Task UserAsync(HttpContextBase ctx, RequestContext rc)
        {
            Api.RequireAdmin(rc);
            User user = await ReadUserAsync(ctx).ConfigureAwait(false);
            await Api.SendJsonAsync(ctx, rc, 200, DtoMapper.ToDto(user)).ConfigureAwait(false);
        }

        /// <summary>
        /// PUT /v1.0/api/admin/users/{id}.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        /// <param name="rc">Request context.</param>
        /// <returns>Task.</returns>
        public async Task UpdateUserAsync(HttpContextBase ctx, RequestContext rc)
        {
            AuthenticatedPrincipal admin = Api.RequireAdmin(rc);
            AdminUserUpdateRequest request = Api.ReadJson<AdminUserUpdateRequest>(ctx, rc);
            User user = await ReadUserAsync(ctx).ConfigureAwait(false);
            user = await _Server.Accounts.AdminUpdateAsync(user, request.Active, request.IsAdmin, request.EmailVerified, request.FirstName, request.LastName, ctx.Token).ConfigureAwait(false);
            await _Server.Audit.WriteAsync("admin.user.update", "success", user.TenantId, admin.User.Id, "user", user.Id, rc.SourceIp, null, ctx.Token).ConfigureAwait(false);
            await Api.SendJsonAsync(ctx, rc, 200, DtoMapper.ToDto(user)).ConfigureAwait(false);
        }

        /// <summary>
        /// DELETE /v1.0/api/admin/users/{id}.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        /// <param name="rc">Request context.</param>
        /// <returns>Task.</returns>
        public async Task DeleteUserAsync(HttpContextBase ctx, RequestContext rc)
        {
            AuthenticatedPrincipal admin = Api.RequireAdmin(rc);
            User user = await ReadUserAsync(ctx).ConfigureAwait(false);
            await _Server.Accounts.DeleteUserAsync(user, _Server.Machines, ctx.Token).ConfigureAwait(false);
            await _Server.Audit.WriteAsync("admin.user.delete", "success", user.TenantId, admin.User.Id, "user", user.Id, rc.SourceIp, null, ctx.Token).ConfigureAwait(false);
            await Api.SendNoContentAsync(ctx).ConfigureAwait(false);
        }

        /// <summary>
        /// GET /v1.0/api/admin/machines.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        /// <param name="rc">Request context.</param>
        /// <returns>Task.</returns>
        public async Task MachinesAsync(HttpContextBase ctx, RequestContext rc)
        {
            Api.RequireAdmin(rc);
            MachineFilter filter = new MachineFilter { UserId = Api.Query(ctx, "userId"), NameContains = Api.Query(ctx, "name"), IncludeRevoked = Api.QueryBool(ctx, "includeRevoked") ?? false };
            PagedResult<Machine> page = await _Server.Database.Machines.EnumerateAsync(filter, Api.Page(ctx), ctx.Token).ConfigureAwait(false);
            PagedResult<MachineDto> dtos = page.Map((Machine m) => DtoMapper.ToDto(m, _Server.Registry.IsOnline(m.Id)));
            bool? online = Api.QueryBool(ctx, "online");
            if (online.HasValue) dtos.Items = dtos.Items.Where(m => m.Online == online.Value).ToList();
            await Api.SendJsonAsync(ctx, rc, 200, dtos).ConfigureAwait(false);
        }

        /// <summary>
        /// GET /v1.0/api/admin/plans.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        /// <param name="rc">Request context.</param>
        /// <returns>Task.</returns>
        public async Task PlansAsync(HttpContextBase ctx, RequestContext rc)
        {
            Api.RequireAdmin(rc);
            List<Plan> plans = await _Server.Database.Plans.EnumerateAsync(true, ctx.Token).ConfigureAwait(false);
            await Api.SendJsonAsync(ctx, rc, 200, plans.Select(DtoMapper.ToDto).ToList()).ConfigureAwait(false);
        }

        /// <summary>
        /// POST /v1.0/api/admin/plans.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        /// <param name="rc">Request context.</param>
        /// <returns>Task.</returns>
        /// <exception cref="ApiException">400 for invalid input, 409 for a duplicate code.</exception>
        public async Task CreatePlanAsync(HttpContextBase ctx, RequestContext rc)
        {
            Api.RequireAdmin(rc);
            PlanSaveRequest request = Api.ReadJson<PlanSaveRequest>(ctx, rc);
            Plan plan = new Plan();
            Apply(plan, request);
            if (await _Server.Database.Plans.ReadByCodeAsync(plan.Code, ctx.Token).ConfigureAwait(false) != null) throw ApiException.Conflict("Conflict", "A plan with code " + plan.Code + " exists.");
            await _Server.Database.Plans.CreateAsync(plan, ctx.Token).ConfigureAwait(false);
            _Server.Entitlements.InvalidateAll();
            await Api.SendJsonAsync(ctx, rc, 201, DtoMapper.ToDto(plan)).ConfigureAwait(false);
        }

        /// <summary>
        /// PUT /v1.0/api/admin/plans/{id}.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        /// <param name="rc">Request context.</param>
        /// <returns>Task.</returns>
        /// <exception cref="ApiException">400, 404.</exception>
        public async Task UpdatePlanAsync(HttpContextBase ctx, RequestContext rc)
        {
            Api.RequireAdmin(rc);
            PlanSaveRequest request = Api.ReadJson<PlanSaveRequest>(ctx, rc);
            Plan plan = await _Server.Database.Plans.ReadAsync(Api.PathValue(ctx, "/v1.0/api/admin/plans/{id}", "id"), ctx.Token).ConfigureAwait(false) ?? throw ApiException.NotFound("Plan");
            string originalCode = plan.Code;
            Apply(plan, request);
            plan.Code = originalCode;
            await _Server.Database.Plans.UpdateAsync(plan, ctx.Token).ConfigureAwait(false);
            _Server.Entitlements.InvalidateAll();
            await Api.SendJsonAsync(ctx, rc, 200, DtoMapper.ToDto(plan)).ConfigureAwait(false);
        }

        /// <summary>
        /// GET /v1.0/api/admin/accounts/{accountId}/overrides.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        /// <param name="rc">Request context.</param>
        /// <returns>Task.</returns>
        public async Task OverridesAsync(HttpContextBase ctx, RequestContext rc)
        {
            Api.RequireAdmin(rc);
            string accountId = Api.PathValue(ctx, "/v1.0/api/admin/accounts/{accountId}/overrides", "accountId");
            List<EntitlementOverride> items = await _Server.Database.EntitlementOverrides.EnumerateForAccountAsync(accountId, ctx.Token).ConfigureAwait(false);
            await Api.SendJsonAsync(ctx, rc, 200, items.Select(DtoMapper.ToDto).ToList()).ConfigureAwait(false);
        }

        /// <summary>
        /// POST /v1.0/api/admin/accounts/{accountId}/overrides.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        /// <param name="rc">Request context.</param>
        /// <returns>Task.</returns>
        /// <exception cref="ApiException">400 for an unknown feature, 404 for an unknown account.</exception>
        public async Task CreateOverrideAsync(HttpContextBase ctx, RequestContext rc)
        {
            AuthenticatedPrincipal admin = Api.RequireAdmin(rc);
            string accountId = Api.PathValue(ctx, "/v1.0/api/admin/accounts/{accountId}/overrides", "accountId");
            OverrideCreateRequest request = Api.ReadJson<OverrideCreateRequest>(ctx, rc);
            if (await _Server.Database.Accounts.ReadAsync(accountId, ctx.Token).ConfigureAwait(false) == null) throw ApiException.NotFound("Account");
            if (String.IsNullOrWhiteSpace(request.FeatureKey) || !Constants.FeatureKeys.Contains(request.FeatureKey)) throw ApiException.BadRequest("featureKey must be one of " + String.Join(", ", Constants.FeatureKeys) + ".");
            EntitlementOverride item = new EntitlementOverride { AccountId = accountId, FeatureKey = request.FeatureKey, LimitValue = request.Limit, Reason = (request.Reason ?? String.Empty).Trim(), ExpiresUtc = request.ExpiresUtc };
            await _Server.Database.EntitlementOverrides.CreateAsync(item, ctx.Token).ConfigureAwait(false);
            _Server.Entitlements.Invalidate(accountId);
            await _Server.Audit.WriteAsync("admin.override.create", "success", null, admin.User.Id, "account", accountId, rc.SourceIp, item.FeatureKey + "=" + (item.LimitValue?.ToString() ?? "unlimited"), ctx.Token).ConfigureAwait(false);
            await Api.SendJsonAsync(ctx, rc, 201, DtoMapper.ToDto(item)).ConfigureAwait(false);
        }

        /// <summary>
        /// DELETE /v1.0/api/admin/accounts/{accountId}/overrides/{id}.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        /// <param name="rc">Request context.</param>
        /// <returns>Task.</returns>
        /// <exception cref="ApiException">404.</exception>
        public async Task DeleteOverrideAsync(HttpContextBase ctx, RequestContext rc)
        {
            Api.RequireAdmin(rc);
            string accountId = Api.PathValue(ctx, "/v1.0/api/admin/accounts/{accountId}/overrides/{id}", "accountId");
            string id = Api.PathValue(ctx, "/v1.0/api/admin/accounts/{accountId}/overrides/{id}", "id");
            if (!await _Server.Database.EntitlementOverrides.DeleteAsync(accountId, id, ctx.Token).ConfigureAwait(false)) throw ApiException.NotFound("Override");
            _Server.Entitlements.Invalidate(accountId);
            await Api.SendNoContentAsync(ctx).ConfigureAwait(false);
        }

        /// <summary>
        /// GET /v1.0/api/admin/audit.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        /// <param name="rc">Request context.</param>
        /// <returns>Task.</returns>
        public async Task AuditAsync(HttpContextBase ctx, RequestContext rc)
        {
            Api.RequireAdmin(rc);
            AuditFilter filter = new AuditFilter { EventType = Api.Query(ctx, "eventType"), UserId = Api.Query(ctx, "userId"), FromUtc = Api.QueryUtc(ctx, "fromUtc"), ToUtc = Api.QueryUtc(ctx, "toUtc") };
            PagedResult<AuditRecord> page = await _Server.Database.Audit.EnumerateAsync(filter, Api.Page(ctx), ctx.Token).ConfigureAwait(false);
            Dictionary<string, string> principals = new Dictionary<string, string>(StringComparer.Ordinal);
            foreach (string userId in page.Items.Select(r => r.UserId).Where(u => !String.IsNullOrEmpty(u)).Distinct())
            {
                User? user = await _Server.Database.Users.ReadAsync(userId, ctx.Token).ConfigureAwait(false);
                principals[userId] = user?.Email ?? userId;
            }

            await Api.SendJsonAsync(ctx, rc, 200, page.Map((AuditRecord r) => DtoMapper.ToDto(r, String.IsNullOrEmpty(r.UserId) ? "system" : principals[r.UserId]))).ConfigureAwait(false);
        }

        /// <summary>
        /// GET /v1.0/api/admin/settings.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        /// <param name="rc">Request context.</param>
        /// <returns>Task.</returns>
        public Task SettingsAsync(HttpContextBase ctx, RequestContext rc)
        {
            Api.RequireAdmin(rc);
            MuxCloudSettings copy = JsonSerializer.Deserialize<MuxCloudSettings>(JsonSerializer.Serialize(_Server.Settings, SettingsLoader.JsonOptions), SettingsLoader.JsonOptions) ?? new MuxCloudSettings();
            copy.Auth.SigningKey = Mask(copy.Auth.SigningKey);
            copy.Admin.Password = Mask(copy.Admin.Password);
            copy.Database.Password = Mask(copy.Database.Password);
            copy.Database.ConnectionString = Mask(copy.Database.ConnectionString);
            copy.Email.Mailgun.ApiKey = Mask(copy.Email.Mailgun.ApiKey);
            copy.Push.ExpoAccessToken = Mask(copy.Push.ExpoAccessToken);
            return Api.SendJsonAsync(ctx, rc, 200, new AdminSettingsResponse { Settings = copy, EnvironmentOverrides = _Server.Settings.EnvironmentOverrides.ToList() });
        }

        /// <summary>
        /// POST /v1.0/api/admin/email/test.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        /// <param name="rc">Request context.</param>
        /// <returns>Task.</returns>
        /// <exception cref="ApiException">400 without a recipient.</exception>
        public async Task EmailTestAsync(HttpContextBase ctx, RequestContext rc)
        {
            Api.RequireAdmin(rc);
            EmailTestRequest request = Api.ReadJson<EmailTestRequest>(ctx, rc);
            if (String.IsNullOrWhiteSpace(request.To)) throw ApiException.BadRequest("to is required.");
            bool sent = await _Server.Email.SendTestAsync(request.To, ctx.Token).ConfigureAwait(false);
            await Api.SendJsonAsync(ctx, rc, 202, new AcceptedResponse { Accepted = sent }).ConfigureAwait(false);
        }

        #endregion

        #region Private-Methods

        private async Task<User> ReadUserAsync(HttpContextBase ctx)
        {
            string id = Api.PathValue(ctx, "/v1.0/api/admin/users/{id}", "id");
            return await _Server.Database.Users.ReadAsync(id, ctx.Token).ConfigureAwait(false) ?? throw ApiException.NotFound("User");
        }

        private static void Apply(Plan plan, PlanSaveRequest request)
        {
            string code = (request.Code ?? String.Empty).Trim().ToLowerInvariant();
            string name = (request.Name ?? String.Empty).Trim();
            if (code.Length == 0 || code.Length > 64) throw ApiException.BadRequest("code must be 1 to 64 characters.");
            if (name.Length == 0 || name.Length > 100) throw ApiException.BadRequest("name must be 1 to 100 characters.");
            if (request.PriceCents < 0) throw ApiException.BadRequest("priceCents must not be negative.");
            string interval = String.IsNullOrWhiteSpace(request.Interval) ? "month" : request.Interval.Trim().ToLowerInvariant();
            if (interval != "month" && interval != "year") throw ApiException.BadRequest("interval must be month or year.");
            plan.Code = code;
            plan.Name = name;
            plan.PriceCents = request.PriceCents;
            plan.Currency = String.IsNullOrWhiteSpace(request.Currency) ? "usd" : request.Currency.Trim().ToLowerInvariant();
            plan.BillingInterval = interval;
            plan.Active = request.Active;
            plan.IsPublic = request.Public;
            plan.Features = new List<PlanFeature>();
            foreach (PlanFeatureRequest feature in request.Features)
            {
                if (String.IsNullOrWhiteSpace(feature.Key) || !Constants.FeatureKeys.Contains(feature.Key)) throw ApiException.BadRequest("feature key must be one of " + String.Join(", ", Constants.FeatureKeys) + ".");
                if (plan.Features.Any(f => f.FeatureKey == feature.Key)) throw ApiException.BadRequest("feature " + feature.Key + " is listed twice.");
                plan.Features.Add(new PlanFeature { PlanId = plan.Id, FeatureKey = feature.Key, LimitValue = feature.Limit });
            }
        }

        private static string Mask(string value)
        {
            return String.IsNullOrEmpty(value) ? "(not set)" : "(set)";
        }

        #endregion
    }
}
