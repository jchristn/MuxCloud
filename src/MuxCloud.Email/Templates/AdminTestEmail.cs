namespace MuxCloud.Email.Templates
{
    using System;
    using System.Collections.Generic;
    using MuxCloud.Email.Blocks;

    /// <summary>
    /// Administrative test message. Template key admin_test.
    /// </summary>
    public sealed class AdminTestEmail : EmailTemplate
    {
        #region Public-Members

        /// <summary>
        /// Server node that sent the message.
        /// </summary>
        public string NodeId { get; set; } = String.Empty;

        /// <summary>
        /// Provider name.
        /// </summary>
        public string Provider { get; set; } = String.Empty;

        #endregion

        #region Public-Methods

        /// <inheritdoc />
        public override string Key
        {
            get { return "admin_test"; }
        }

        /// <inheritdoc />
        public override EmailDocument Compose()
        {
            EmailDocument d = new EmailDocument { Subject = "Mux Cloud test email", Preheader = "Email delivery works.", Heading = "Email delivery works" };
            d.Blocks.Add(new EmailParagraphBlock("This is a test message from Mux Cloud. If you can read it, outgoing email is configured correctly."));
            d.Blocks.Add(new EmailFieldsBlock(new List<EmailField>
            {
                new EmailField("Node", NodeId),
                new EmailField("Provider", Provider),
                new EmailField("Sent", DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss", System.Globalization.CultureInfo.InvariantCulture) + " UTC")
            }));
            return d;
        }

        #endregion
    }
}
