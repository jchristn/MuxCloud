namespace MuxCloud.Core.Settings
{
    using System;
    using MuxCloud.Core.Enums;

    /// <summary>
    /// Email settings.
    /// </summary>
    public class EmailSettings
    {
        #region Public-Members

        /// <summary>
        /// Provider. Default <see cref="EmailProviderEnum.File"/>.
        /// </summary>
        public EmailProviderEnum Provider { get; set; } = EmailProviderEnum.File;

        /// <summary>
        /// Sender display name. Default Mux Cloud.
        /// </summary>
        public string FromName
        {
            get { return _FromName; }
            set { _FromName = String.IsNullOrWhiteSpace(value) ? "Mux Cloud" : value; }
        }

        /// <summary>
        /// Sender address. Default hello@latticetech.ai.
        /// </summary>
        public string FromAddress
        {
            get { return _FromAddress; }
            set { _FromAddress = String.IsNullOrWhiteSpace(value) ? "hello@latticetech.ai" : value.Trim(); }
        }

        /// <summary>
        /// Support address shown in every footer. Default hello@latticetech.ai.
        /// </summary>
        public string SupportAddress
        {
            get { return _SupportAddress; }
            set { _SupportAddress = String.IsNullOrWhiteSpace(value) ? "hello@latticetech.ai" : value.Trim(); }
        }

        /// <summary>
        /// Absolute logo URL used in messages.
        /// </summary>
        public string LogoUrl
        {
            get { return _LogoUrl; }
            set { _LogoUrl = String.IsNullOrWhiteSpace(value) ? "https://raw.githubusercontent.com/jchristn/MuxCloud/main/assets/logo-black.png" : value.Trim(); }
        }

        /// <summary>
        /// File provider settings.
        /// </summary>
        public FileEmailSettings File
        {
            get { return _File; }
            set { _File = value ?? new FileEmailSettings(); }
        }

        /// <summary>
        /// Mailgun provider settings.
        /// </summary>
        public MailgunEmailSettings Mailgun
        {
            get { return _Mailgun; }
            set { _Mailgun = value ?? new MailgunEmailSettings(); }
        }

        #endregion

        #region Private-Members

        private string _FromName = "Mux Cloud";
        private string _FromAddress = "hello@latticetech.ai";
        private string _SupportAddress = "hello@latticetech.ai";
        private string _LogoUrl = "https://raw.githubusercontent.com/jchristn/MuxCloud/main/assets/logo-black.png";
        private FileEmailSettings _File = new FileEmailSettings();
        private MailgunEmailSettings _Mailgun = new MailgunEmailSettings();

        #endregion
    }
}
