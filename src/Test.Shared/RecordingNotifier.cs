namespace Test.Shared
{
    using System.Collections.Concurrent;
    using System.Threading;
    using System.Threading.Tasks;
    using MuxCloud.Core.Models;
    using MuxCloud.Core.Services.Interfaces;

    /// <summary>
    /// Notifier that records what would have been sent.
    /// </summary>
    public class RecordingNotifier : IAccountNotifier
    {
        #region Public-Members

        /// <summary>
        /// Notifications as "kind|email|link".
        /// </summary>
        public ConcurrentQueue<string> Sent { get; } = new ConcurrentQueue<string>();

        /// <summary>
        /// Last verification link.
        /// </summary>
        public string LastVerificationLink { get; private set; } = string.Empty;

        /// <summary>
        /// Last reset link.
        /// </summary>
        public string LastResetLink { get; private set; } = string.Empty;

        #endregion

        #region Public-Methods

        /// <inheritdoc />
        public Task SendVerificationAsync(User user, string link, CancellationToken token = default)
        {
            LastVerificationLink = link;
            Sent.Enqueue("verify|" + user.Email + "|" + link);
            return Task.CompletedTask;
        }

        /// <inheritdoc />
        public Task SendWelcomeAsync(User user, CancellationToken token = default)
        {
            Sent.Enqueue("welcome|" + user.Email + "|");
            return Task.CompletedTask;
        }

        /// <inheritdoc />
        public Task SendPasswordResetAsync(User user, string link, CancellationToken token = default)
        {
            LastResetLink = link;
            Sent.Enqueue("reset|" + user.Email + "|" + link);
            return Task.CompletedTask;
        }

        /// <inheritdoc />
        public Task SendPasswordChangedAsync(User user, CancellationToken token = default)
        {
            Sent.Enqueue("password-changed|" + user.Email + "|");
            return Task.CompletedTask;
        }

        /// <inheritdoc />
        public Task SendMachineEnrolledAsync(User user, Machine machine, string sourceIp, string revokeLink, CancellationToken token = default)
        {
            Sent.Enqueue("machine-enrolled|" + user.Email + "|" + revokeLink);
            return Task.CompletedTask;
        }

        /// <inheritdoc />
        public Task SendMachineRevokedAsync(User user, Machine machine, CancellationToken token = default)
        {
            Sent.Enqueue("machine-revoked|" + user.Email + "|" + machine.Id);
            return Task.CompletedTask;
        }

        /// <inheritdoc />
        public Task SendAccountDeletedAsync(User user, CancellationToken token = default)
        {
            Sent.Enqueue("account-deleted|" + user.Email + "|");
            return Task.CompletedTask;
        }

        /// <inheritdoc />
        public Task<bool> SendTestAsync(string to, CancellationToken token = default)
        {
            Sent.Enqueue("test|" + to + "|");
            return Task.FromResult(true);
        }

        /// <summary>
        /// Token value from a link's token query parameter.
        /// </summary>
        /// <param name="link">Link.</param>
        /// <returns>Token.</returns>
        public static string TokenFrom(string link)
        {
            int i = link.IndexOf("token=", System.StringComparison.Ordinal);
            return i < 0 ? string.Empty : System.Uri.UnescapeDataString(link.Substring(i + 6));
        }

        #endregion
    }
}
