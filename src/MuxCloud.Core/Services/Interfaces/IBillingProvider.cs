namespace MuxCloud.Core.Services.Interfaces
{
    using System.Threading;
    using System.Threading.Tasks;
    using MuxCloud.Core.Models;

    /// <summary>
    /// Payment provider boundary (for example Stripe). Version 2.0.0 ships only <see cref="Implementations.NullBillingProvider"/>.
    /// </summary>
    public interface IBillingProvider
    {
        /// <summary>
        /// Provider name, for example none or stripe.
        /// </summary>
        string Name { get; }

        /// <summary>
        /// Whether checkout and portal sessions can be created.
        /// </summary>
        bool IsConfigured { get; }

        /// <summary>
        /// Create a checkout session for a plan.
        /// </summary>
        /// <param name="account">Account.</param>
        /// <param name="user">Buying user.</param>
        /// <param name="plan">Plan.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>URL to send the browser to.</returns>
        Task<string> CreateCheckoutAsync(Account account, User user, Plan plan, CancellationToken token = default);

        /// <summary>
        /// Create a customer portal session.
        /// </summary>
        /// <param name="account">Account.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>URL to send the browser to.</returns>
        Task<string> CreatePortalSessionAsync(Account account, CancellationToken token = default);

        /// <summary>
        /// Handle a webhook delivery.
        /// </summary>
        /// <param name="body">Raw body.</param>
        /// <param name="signature">Signature header value.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>True when the delivery was accepted.</returns>
        Task<bool> HandleWebhookAsync(string body, string signature, CancellationToken token = default);
    }
}
