namespace MuxCloud.Email
{
    using System;
    using System.Collections.Generic;

    /// <summary>
    /// What a template composes: subject, preheader, heading, and body blocks. The layout turns it into HTML and text.
    /// </summary>
    public class EmailDocument
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
        /// Heading shown at the top of the card.
        /// </summary>
        public string Heading { get; set; } = String.Empty;

        /// <summary>
        /// Body blocks, in order.
        /// </summary>
        public List<EmailBlock> Blocks { get; } = new List<EmailBlock>();

        #endregion
    }
}
