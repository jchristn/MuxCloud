namespace MuxCloud.Email
{
    using System;
    using System.Threading;
    using System.Threading.Tasks;
    using MuxCloud.Core.Enums;
    using MuxCloud.Core.Models;
    using MuxCloud.Core.Services.Interfaces;
    using MuxCloud.Core.Settings;
    using MuxCloud.Email.Providers;
    using MuxCloud.Email.Templates;

    /// <summary>
    /// Renders templates in the Mux Cloud brand and hands them to the configured provider. Delivery failures are logged
    /// and never thrown to callers.
    /// Thread safety: safe to call concurrently.
    /// </summary>
    public class EmailService : IAccountNotifier
    {
        #region Public-Members

        /// <summary>
        /// Provider in use.
        /// </summary>
        public IEmailProvider Provider { get; }

        /// <summary>
        /// Brand used for every message.
        /// </summary>
        public EmailBrand Brand { get; }

        /// <summary>
        /// Called with a log line for each send and failure, or null.
        /// </summary>
        public Action<string>? Log { get; set; } = null;

        #endregion

        #region Private-Members

        private readonly MuxCloudSettings _Settings;

        #endregion

        #region Constructors-and-Factories

        /// <summary>
        /// Instantiate from settings.
        /// </summary>
        /// <param name="settings">Settings.</param>
        /// <exception cref="ArgumentNullException">settings is null.</exception>
        public EmailService(MuxCloudSettings settings)
        {
            ArgumentNullException.ThrowIfNull(settings);
            _Settings = settings;
            Provider = CreateProvider(settings);
            string web = settings.Server.PublicUrl;
            Brand = new EmailBrand
            {
                Name = "Mux Cloud",
                LogoUrl = settings.Email.LogoUrl,
                PrimaryColor = "#111111",
                OnPrimaryColor = "#FFFFFF",
                SupportEmail = settings.Email.SupportAddress,
                WebUrl = web,
                PrivacyUrl = web + "/legal/privacy",
                TermsUrl = web + "/legal/terms"
            };
        }

        #endregion

        #region Public-Methods

        /// <summary>
        /// Create the provider configured in settings.
        /// </summary>
        /// <param name="settings">Settings.</param>
        /// <returns>Provider.</returns>
        public static IEmailProvider CreateProvider(MuxCloudSettings settings)
        {
            ArgumentNullException.ThrowIfNull(settings);
            switch (settings.Email.Provider)
            {
                case EmailProviderEnum.File:
                    return new FileEmailProvider(settings.Email.File.Directory);
                case EmailProviderEnum.Mailgun:
                    return new MailgunEmailProvider(settings.Email.Mailgun);
                default:
                    return new DisabledEmailProvider();
            }
        }

        /// <summary>
        /// Render a template without sending it.
        /// </summary>
        /// <param name="template">Template.</param>
        /// <returns>Rendered message.</returns>
        public EmailRendered Render(EmailTemplate template)
        {
            ArgumentNullException.ThrowIfNull(template);
            return StandardEmailLayout.Instance.Render(template.Compose(), Brand);
        }

        /// <summary>
        /// Render and send a template.
        /// </summary>
        /// <param name="to">Recipient.</param>
        /// <param name="template">Template.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>True when the provider accepted the message.</returns>
        public async Task<bool> SendAsync(string to, EmailTemplate template, CancellationToken token = default)
        {
            ArgumentNullException.ThrowIfNull(template);
            if (String.IsNullOrWhiteSpace(to)) return false;
            try
            {
                EmailRendered rendered = Render(template);
                EmailMessage message = new EmailMessage
                {
                    To = to.Trim(),
                    FromName = _Settings.Email.FromName,
                    FromAddress = _Settings.Email.FromAddress,
                    Subject = rendered.Subject,
                    Html = rendered.Html,
                    Text = rendered.Text,
                    TemplateKey = template.Key
                };
                bool sent = await Provider.SendAsync(message, token).ConfigureAwait(false);
                Log?.Invoke("email " + template.Key + " via " + Provider.Name + (sent ? " sent" : " skipped"));
                return sent;
            }
            catch (OperationCanceledException) when (token.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception e)
            {
                Log?.Invoke("email " + template.Key + " via " + Provider.Name + " failed: " + e.Message);
                return false;
            }
        }

        /// <inheritdoc />
        public Task SendVerificationAsync(User user, string link, CancellationToken token = default)
        {
            ArgumentNullException.ThrowIfNull(user);
            return SendAsync(user.Email, new VerifyEmailEmail { FirstName = user.FirstName, Link = link }, token);
        }

        /// <inheritdoc />
        public Task SendWelcomeAsync(User user, CancellationToken token = default)
        {
            ArgumentNullException.ThrowIfNull(user);
            return SendAsync(user.Email, new WelcomeEmail { FirstName = user.FirstName, DashboardUrl = _Settings.Server.PublicUrl + "/machines" }, token);
        }

        /// <inheritdoc />
        public Task SendPasswordResetAsync(User user, string link, CancellationToken token = default)
        {
            ArgumentNullException.ThrowIfNull(user);
            return SendAsync(user.Email, new PasswordResetEmail { FirstName = user.FirstName, Link = link }, token);
        }

        /// <inheritdoc />
        public Task SendPasswordChangedAsync(User user, CancellationToken token = default)
        {
            ArgumentNullException.ThrowIfNull(user);
            return SendAsync(user.Email, new PasswordChangedEmail { FirstName = user.FirstName, ChangedUtc = DateTime.UtcNow, SupportAddress = _Settings.Email.SupportAddress }, token);
        }

        /// <inheritdoc />
        public Task SendMachineEnrolledAsync(User user, Machine machine, string sourceIp, string revokeLink, CancellationToken token = default)
        {
            ArgumentNullException.ThrowIfNull(user);
            ArgumentNullException.ThrowIfNull(machine);
            return SendAsync(user.Email, new MachineEnrolledEmail
            {
                FirstName = user.FirstName,
                MachineName = machine.Name,
                Hostname = machine.Hostname,
                Os = machine.Os,
                SourceIp = sourceIp ?? String.Empty,
                EnrolledUtc = machine.CreatedUtc,
                ReviewLink = revokeLink
            }, token);
        }

        /// <inheritdoc />
        public Task SendMachineRevokedAsync(User user, Machine machine, CancellationToken token = default)
        {
            ArgumentNullException.ThrowIfNull(user);
            ArgumentNullException.ThrowIfNull(machine);
            return SendAsync(user.Email, new MachineRevokedEmail { FirstName = user.FirstName, MachineName = machine.Name }, token);
        }

        /// <inheritdoc />
        public Task SendAccountDeletedAsync(User user, CancellationToken token = default)
        {
            ArgumentNullException.ThrowIfNull(user);
            return SendAsync(user.Email, new AccountDeletedEmail { FirstName = user.FirstName, SupportAddress = _Settings.Email.SupportAddress }, token);
        }

        /// <inheritdoc />
        public Task<bool> SendTestAsync(string to, CancellationToken token = default)
        {
            return SendAsync(to, new AdminTestEmail { NodeId = _Settings.Server.NodeId, Provider = Provider.Name }, token);
        }

        #endregion
    }
}
