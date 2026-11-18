namespace MuxCloud.Server.Routes
{
    using MuxCloud.Server.Handlers;
    using WatsonWebserver;
    using WatsonWebserver.Core;

    /// <summary>
    /// Plans, subscription, entitlements, checkout, portal, and provider webhooks.
    /// </summary>
    public class BillingRoutes : RouteRegistrar
    {
        #region Constructors-and-Factories

        /// <summary>
        /// Instantiate.
        /// </summary>
        /// <param name="server">Server.</param>
        public BillingRoutes(MuxCloudServer server) : base(server)
        {
        }

        #endregion

        #region Public-Methods

        /// <inheritdoc />
        public override void Register(Webserver app)
        {
            BillingHandler h = new BillingHandler(Server);
            Add(app, HttpMethod.GET, "/v1.0/api/billing/plans", false, "Billing", "List public plans", h.PlansAsync);
            Add(app, HttpMethod.GET, "/v1.0/api/billing/subscription", true, "Billing", "Current subscription", h.SubscriptionAsync);
            Add(app, HttpMethod.GET, "/v1.0/api/billing/entitlements", true, "Billing", "Effective entitlements", h.EntitlementsAsync);
            Add(app, HttpMethod.POST, "/v1.0/api/billing/checkout", true, "Billing", "Start checkout", h.CheckoutAsync);
            Add(app, HttpMethod.POST, "/v1.0/api/billing/portal", true, "Billing", "Open the billing portal", h.PortalAsync);
            Add(app, HttpMethod.POST, "/v1.0/api/billing/webhooks/{provider}", false, "Billing", "Billing provider webhook", h.WebhookAsync, true);
        }

        #endregion
    }
}
