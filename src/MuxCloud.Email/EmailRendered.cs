namespace MuxCloud.Email
{
    using System;

    /// <summary>
    /// A rendered message.
    /// </summary>
    public class EmailRendered
    {
        #region Public-Members

        /// <summary>
        /// Subject line.
        /// </summary>
        public string Subject { get; set; } = String.Empty;

        /// <summary>
        /// Inbox preview text.
        /// </summary>
        public string Preheader { get; set; } = String.Empty;

        /// <summary>
        /// Complete HTML document.
        /// </summary>
        public string Html { get; set; } = String.Empty;

        /// <summary>
        /// Plain-text version.
        /// </summary>
        public string Text { get; set; } = String.Empty;

        #endregion
    }
}
