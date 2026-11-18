namespace MuxCloud.Core.Services.Interfaces
{
    using System.Threading;
    using System.Threading.Tasks;
    using MuxCloud.Core.Models;

    /// <summary>
    /// Sends account and security notifications (implemented by the email module). Implementations must not throw for
    /// delivery failures; they log and return.
    /// </summary>
    public interface IAccountNotifier
    {
        /// <summary>
        /// Ask the user to confirm their email address.
        /// </summary>
        /// <param name="user">User.</param>
        /// <param name="link">Verification link.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Task.</returns>
        Task SendVerificationAsync(User user, string link, CancellationToken token = default);

        /// <summary>
        /// Welcome a verified user.
        /// </summary>
        /// <param name="user">User.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Task.</returns>
        Task SendWelcomeAsync(User user, CancellationToken token = default);

        /// <summary>
        /// Send a password reset link.
        /// </summary>
        /// <param name="user">User.</param>
        /// <param name="link">Reset link.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Task.</returns>
        Task SendPasswordResetAsync(User user, string link, CancellationToken token = default);

        /// <summary>
        /// Tell the user their password changed.
        /// </summary>
        /// <param name="user">User.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Task.</returns>
        Task SendPasswordChangedAsync(User user, CancellationToken token = default);

        /// <summary>
        /// Security notice: a new machine was connected to the account.
        /// </summary>
        /// <param name="user">User.</param>
        /// <param name="machine">Machine.</param>
        /// <param name="sourceIp">IP address of the enrollment.</param>
        /// <param name="revokeLink">Link to review and revoke the machine.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Task.</returns>
        Task SendMachineEnrolledAsync(User user, Machine machine, string sourceIp, string revokeLink, CancellationToken token = default);

        /// <summary>
        /// Tell the user a machine was revoked.
        /// </summary>
        /// <param name="user">User.</param>
        /// <param name="machine">Machine.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Task.</returns>
        Task SendMachineRevokedAsync(User user, Machine machine, CancellationToken token = default);

        /// <summary>
        /// Confirm that the account was deleted.
        /// </summary>
        /// <param name="user">The deleted user.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Task.</returns>
        Task SendAccountDeletedAsync(User user, CancellationToken token = default);

        /// <summary>
        /// Send the administrative test message.
        /// </summary>
        /// <param name="to">Recipient.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>True when the message was accepted for delivery.</returns>
        Task<bool> SendTestAsync(string to, CancellationToken token = default);
    }
}
