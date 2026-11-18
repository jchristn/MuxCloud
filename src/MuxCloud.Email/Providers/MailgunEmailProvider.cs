namespace MuxCloud.Email.Providers
{
    using System;
    using System.Threading;
    using System.Threading.Tasks;
    using MuxCloud.Core.Settings;
    using SendWithMailgun;

    /// <summary>
    /// Sends through Mailgun with SendWithMailgun (MailgunSender.SendAsync). SendWithMailgun sends one body format per
    /// message, so the HTML body is sent; it carries everything the text body says.
    /// Thread safety: safe to call concurrently.
    /// </summary>
    public class MailgunEmailProvider : IEmailProvider
    {
        #region Public-Members

        /// <inheritdoc />
        public string Name
        {
            get { return "mailgun"; }
        }

        /// <summary>
        /// Whether the domain and API key are set.
        /// </summary>
        public bool IsConfigured
        {
            get { return !String.IsNullOrWhiteSpace(_Settings.Domain) && !String.IsNullOrWhiteSpace(_Settings.ApiKey); }
        }

        #endregion

        #region Private-Members

        private readonly MailgunEmailSettings _Settings;

        #endregion

        #region Constructors-and-Factories

        /// <summary>
        /// Instantiate.
        /// </summary>
        /// <param name="settings">Mailgun settings.</param>
        /// <exception cref="ArgumentNullException">settings is null.</exception>
        public MailgunEmailProvider(MailgunEmailSettings settings)
        {
            ArgumentNullException.ThrowIfNull(settings);
            _Settings = settings;
        }

        #endregion

        #region Public-Methods

        /// <inheritdoc />
        /// <exception cref="InvalidOperationException">Mailgun is not configured or rejected the message.</exception>
        public async Task<bool> SendAsync(EmailMessage message, CancellationToken token = default)
        {
            ArgumentNullException.ThrowIfNull(message);
            if (!IsConfigured) throw new InvalidOperationException("Mailgun is not configured: set Email.Mailgun.Domain and MUXCLOUD_MAILGUN_API_KEY.");
            string from = String.IsNullOrWhiteSpace(message.FromName) ? message.FromAddress : "\"" + message.FromName.Replace("\"", "'", StringComparison.Ordinal) + "\" <" + message.FromAddress + ">";
            MailgunSender sender = new MailgunSender(_Settings.Domain, _Settings.ApiKey, _Settings.BaseUrl);
            string? id;
            try
            {
                id = await sender.SendAsync(message.To, from, message.Subject, message.Html, true, null, null, token).ConfigureAwait(false);
            }
            catch (OperationCanceledException) when (token.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception e) when (!(e is OutOfMemoryException))
            {
                throw new InvalidOperationException("Mailgun delivery through " + _Settings.Domain + " failed (" + e.GetType().Name + ": " + e.Message + ").", e);
            }

            if (String.IsNullOrWhiteSpace(id)) throw new InvalidOperationException("Mailgun did not accept the message for " + _Settings.Domain + ".");
            message.ProviderMessageId = id.Trim().Trim('<', '>');
            return true;
        }

        #endregion
    }
}
