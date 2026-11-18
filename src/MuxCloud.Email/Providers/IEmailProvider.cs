namespace MuxCloud.Email.Providers
{
    using System.Threading;
    using System.Threading.Tasks;

    /// <summary>
    /// Delivery boundary.
    /// </summary>
    public interface IEmailProvider
    {
        /// <summary>
        /// Provider name for logs.
        /// </summary>
        string Name { get; }

        /// <summary>
        /// Deliver a message.
        /// </summary>
        /// <param name="message">Message.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>True when delivered or accepted; false when the provider does not send.</returns>
        Task<bool> SendAsync(EmailMessage message, CancellationToken token = default);
    }
}
