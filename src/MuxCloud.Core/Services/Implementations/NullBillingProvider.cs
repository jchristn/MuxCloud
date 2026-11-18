namespace MuxCloud.Core.Services.Implementations
{
    using System.Threading;
    using System.Threading.Tasks;
    using MuxCloud.Core.Exceptions;
    using MuxCloud.Core.Models;
    using MuxCloud.Core.Services.Interfaces;

    /// <summary>
    /// Billing provider used while no payment provider is configured. Checkout and portal return 501.
    /// </summary>
    public class NullBillingProvider : IBillingProvider
    {
        #region Public-Members

        /// <inheritdoc />
        public string Name
        {
            get { return "none"; }
        }

        /// <inheritdoc />
        public bool IsConfigured
        {
            get { return false; }
        }

        #endregion

        #region Public-Methods

        /// <inheritdoc />
        /// <exception cref="ApiException">Always: 501 NotImplemented.</exception>
        public Task<string> CreateCheckoutAsync(Account account, User user, Plan plan, CancellationToken token = default)
        {
            throw new ApiException(501, "NotImplemented", "Billing is not configured yet.");
        }

        /// <inheritdoc />
        /// <exception cref="ApiException">Always: 501 NotImplemented.</exception>
        public Task<string> CreatePortalSessionAsync(Account account, CancellationToken token = default)
        {
            throw new ApiException(501, "NotImplemented", "Billing is not configured yet.");
        }

        /// <inheritdoc />
        public Task<bool> HandleWebhookAsync(string body, string signature, CancellationToken token = default)
        {
            return Task.FromResult(false);
        }

        #endregion
    }
}
