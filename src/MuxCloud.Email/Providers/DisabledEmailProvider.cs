namespace MuxCloud.Email.Providers
{
    using System.Threading;
    using System.Threading.Tasks;

    /// <summary>
    /// Sends nothing.
    /// </summary>
    public class DisabledEmailProvider : IEmailProvider
    {
        #region Public-Members

        /// <inheritdoc />
        public string Name
        {
            get { return "disabled"; }
        }

        #endregion

        #region Public-Methods

        /// <inheritdoc />
        public Task<bool> SendAsync(EmailMessage message, CancellationToken token = default)
        {
            return Task.FromResult(false);
        }

        #endregion
    }
}
