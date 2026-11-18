namespace MuxCloud.Server.Handlers
{
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Threading.Tasks;
    using MuxCloud.Core.Enums;
    using MuxCloud.Core.Exceptions;
    using MuxCloud.Core.Models;
    using MuxCloud.Core.Requests;
    using MuxCloud.Core.Responses;
    using MuxCloud.Server.Http;
    using WatsonWebserver.Core;

    /// <summary>
    /// Plans, subscription, entitlements, checkout, portal, and provider webhooks.
    /// </summary>
    public class BillingHandler
    {
        #region Private-Members

        private readonly MuxCloudServer _Server;

        #endregion

        #region Constructors-and-Factories

        /// <summary>
        /// Instantiate.
        /// </summary>
        /// <param name="server">Server.</param>
        public BillingHandler(MuxCloudServer server)
        {
            _Server = server ?? throw new ArgumentNullException(nameof(server));
        }

        #endregion

        #region Public-Methods

        /// <summary>
        /// GET /v1.0/api/billing/plans.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        /// <param name="rc">Request context.</param>
        /// <returns>Task.</returns>
        public async Task PlansAsync(HttpContextBase ctx, RequestContext rc)
        {
            List<Plan> plans = await _Server.Database.Plans.EnumerateAsync(false, ctx.Token).ConfigureAwait(false);
            await Api.SendJsonAsync(ctx, rc, 200, plans.Select(DtoMapper.ToDto).ToList()).ConfigureAwait(false);
        }

        /// <summary>
        /// GET /v1.0/api/billing/subscription.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        /// <param name="rc">Request context.</param>
        /// <returns>Task.</returns>
        public async Task SubscriptionAsync(HttpContextBase ctx, RequestContext rc)
        {
            AuthenticatedPrincipal principal = Api.RequireUser(rc);
            List<Subscription> subscriptions = await _Server.Database.Subscriptions.EnumerateForAccountAsync(principal.User.AccountId, ctx.Token).ConfigureAwait(false);
            Subscription? current = subscriptions.FirstOrDefault(s => s.Status == SubscriptionStatusEnum.Active || s.Status == SubscriptionStatusEnum.Trialing || s.Status == SubscriptionStatusEnum.PastDue) ?? subscriptions.FirstOrDefault();
            if (current == null)
            {
                await Api.SendJsonAsync(ctx, rc, 200, null).ConfigureAwait(false);
                return;
            }

            Plan? plan = await _Server.Database.Plans.ReadAsync(current.PlanId, ctx.Token).ConfigureAwait(false);
            await Api.SendJsonAsync(ctx, rc, 200, DtoMapper.ToDto(current, plan?.Code ?? String.Empty)).ConfigureAwait(false);
        }

        /// <summary>
        /// GET /v1.0/api/billing/entitlements.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        /// <param name="rc">Request context.</param>
        /// <returns>Task.</returns>
        public async Task EntitlementsAsync(HttpContextBase ctx, RequestContext rc)
        {
            AuthenticatedPrincipal principal = Api.RequireUser(rc);
            EffectiveEntitlements entitlements = await _Server.Entitlements.GetAsync(principal.User.AccountId, ctx.Token).ConfigureAwait(false);
            await Api.SendJsonAsync(ctx, rc, 200, entitlements).ConfigureAwait(false);
        }

        /// <summary>
        /// POST /v1.0/api/billing/checkout.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        /// <param name="rc">Request context.</param>
        /// <returns>Task.</returns>
        /// <exception cref="ApiException">404 for an unknown plan, 501 while billing is not configured.</exception>
        public async Task CheckoutAsync(HttpContextBase ctx, RequestContext rc)
        {
            AuthenticatedPrincipal principal = Api.RequireUser(rc);
            CheckoutRequest request = Api.ReadJson<CheckoutRequest>(ctx, rc);
            Plan plan = await _Server.Database.Plans.ReadByCodeAsync(request.PlanCode ?? String.Empty, ctx.Token).ConfigureAwait(false) ?? throw ApiException.NotFound("Plan");
            Account account = await _Server.Database.Accounts.ReadAsync(principal.User.AccountId, ctx.Token).ConfigureAwait(false) ?? throw ApiException.NotFound("Account");
            string url = await _Server.Billing.CreateCheckoutAsync(account, principal.User, plan, ctx.Token).ConfigureAwait(false);
            await Api.SendJsonAsync(ctx, rc, 200, new UrlResponse { Url = url }).ConfigureAwait(false);
        }

        /// <summary>
        /// POST /v1.0/api/billing/portal.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        /// <param name="rc">Request context.</param>
        /// <returns>Task.</returns>
        /// <exception cref="ApiException">501 while billing is not configured.</exception>
        public async Task PortalAsync(HttpContextBase ctx, RequestContext rc)
        {
            AuthenticatedPrincipal principal = Api.RequireUser(rc);
            Account account = await _Server.Database.Accounts.ReadAsync(principal.User.AccountId, ctx.Token).ConfigureAwait(false) ?? throw ApiException.NotFound("Account");
            string url = await _Server.Billing.CreatePortalSessionAsync(account, ctx.Token).ConfigureAwait(false);
            await Api.SendJsonAsync(ctx, rc, 200, new UrlResponse { Url = url }).ConfigureAwait(false);
        }

        /// <summary>
        /// POST /v1.0/api/billing/webhooks/{provider}.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        /// <param name="rc">Request context.</param>
        /// <returns>Task.</returns>
        /// <exception cref="ApiException">404 for a provider that is not configured, 400 for a rejected delivery.</exception>
        public async Task WebhookAsync(HttpContextBase ctx, RequestContext rc)
        {
            string provider = Api.PathValue(ctx, "/v1.0/api/billing/webhooks/{provider}", "provider");
            if (!_Server.Billing.IsConfigured || !String.Equals(provider, _Server.Billing.Name, StringComparison.OrdinalIgnoreCase)) throw ApiException.NotFound("Billing provider");
            string body = ctx.Request.DataAsString ?? String.Empty;
            string signature = ctx.Request.RetrieveHeaderValue("Stripe-Signature") ?? ctx.Request.RetrieveHeaderValue("X-Signature") ?? String.Empty;
            if (!await _Server.Billing.HandleWebhookAsync(body, signature, ctx.Token).ConfigureAwait(false)) throw ApiException.BadRequest("The webhook delivery was rejected.");
            _Server.Entitlements.InvalidateAll();
            await Api.SendJsonAsync(ctx, rc, 200, new AcceptedResponse()).ConfigureAwait(false);
        }

        #endregion
    }
}
