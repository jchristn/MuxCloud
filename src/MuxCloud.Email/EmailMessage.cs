namespace MuxCloud.Email
{
    using System;

    /// <summary>
    /// A message ready for a provider.
    /// </summary>
    public class EmailMessage
    {
        #region Public-Members

        /// <summary>
        /// Recipient address.
        /// </summary>
        public string To { get; set; } = String.Empty;

        /// <summary>
        /// Sender display name.
        /// </summary>
        public string FromName { get; set; } = String.Empty;

        /// <summary>
        /// Sender address.
        /// </summary>
        public string FromAddress { get; set; } = String.Empty;

        /// <summary>
        /// Subject.
        /// </summary>
        public string Subject { get; set; } = String.Empty;

        /// <summary>
        /// HTML body.
        /// </summary>
        public string Html { get; set; } = String.Empty;

        /// <summary>
        /// Plain-text body.
        /// </summary>
        public string Text { get; set; } = String.Empty;

        /// <summary>
        /// Template key, for logs and the file provider's file names.
        /// </summary>
        public string TemplateKey { get; set; } = String.Empty;

        /// <summary>
        /// Provider message identifier after sending, or empty.
        /// </summary>
        public string ProviderMessageId { get; set; } = String.Empty;

        #endregion
    }
}
