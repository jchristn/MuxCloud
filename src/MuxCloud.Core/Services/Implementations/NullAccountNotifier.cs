namespace MuxCloud.Core.Services.Implementations
{
    using System.Threading;
    using System.Threading.Tasks;
    using MuxCloud.Core.Models;
    using MuxCloud.Core.Services.Interfaces;

    /// <summary>
    /// Notifier that sends nothing.
    /// </summary>
    public class NullAccountNotifier : IAccountNotifier
    {
        #region Public-Methods

        /// <inheritdoc />
        public Task SendVerificationAsync(User user, string link, CancellationToken token = default)
        {
            return Task.CompletedTask;
        }

        /// <inheritdoc />
        public Task SendWelcomeAsync(User user, CancellationToken token = default)
        {
            return Task.CompletedTask;
        }

        /// <inheritdoc />
        public Task SendPasswordResetAsync(User user, string link, CancellationToken token = default)
        {
            return Task.CompletedTask;
        }

        /// <inheritdoc />
        public Task SendPasswordChangedAsync(User user, CancellationToken token = default)
        {
            return Task.CompletedTask;
        }

        /// <inheritdoc />
        public Task SendMachineEnrolledAsync(User user, Machine machine, string sourceIp, string revokeLink, CancellationToken token = default)
        {
            return Task.CompletedTask;
        }

        /// <inheritdoc />
        public Task SendMachineRevokedAsync(User user, Machine machine, CancellationToken token = default)
        {
            return Task.CompletedTask;
        }

        /// <inheritdoc />
        public Task SendAccountDeletedAsync(User user, CancellationToken token = default)
        {
            return Task.CompletedTask;
        }

        /// <inheritdoc />
        public Task<bool> SendTestAsync(string to, CancellationToken token = default)
        {
            return Task.FromResult(false);
        }

        #endregion
    }
}
