namespace MuxCloud.Email.Templates
{
    using System;
    using System.Collections.Generic;
    using MuxCloud.Email.Blocks;

    /// <summary>
    /// Confirm an email address after signup. Template key verify_email.
    /// </summary>
    public sealed class VerifyEmailEmail : EmailTemplate
    {
        #region Public-Members

        /// <summary>
        /// Recipient first name.
        /// </summary>
        public string FirstName { get; set; } = String.Empty;

        /// <summary>
        /// Verification link.
        /// </summary>
        public string Link { get; set; } = String.Empty;

        #endregion

        #region Public-Methods

        /// <inheritdoc />
        public override string Key
        {
            get { return "verify_email"; }
        }

        /// <inheritdoc />
        public override EmailDocument Compose()
        {
            EmailDocument d = new EmailDocument { Subject = "Confirm your email for Mux Cloud", Preheader = "One click and your machines are a sign-in away.", Heading = "Confirm your email address" };
            d.Blocks.Add(new EmailParagraphBlock(Greeting(FirstName)));
            d.Blocks.Add(new EmailParagraphBlock("Thanks for signing up for Mux Cloud. Confirm this address and you can connect your machines and use mux from your browser or phone."));
            d.Blocks.Add(new EmailButtonBlock("Confirm email", Link));
            d.Blocks.Add(new EmailParagraphBlock("The link works once and expires in 48 hours. If you did not create an account, ignore this email."));
            return d;
        }

        #endregion
    }
}
