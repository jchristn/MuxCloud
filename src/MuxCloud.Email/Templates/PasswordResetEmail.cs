namespace MuxCloud.Email.Templates
{
    using System;
    using System.Collections.Generic;
    using MuxCloud.Email.Blocks;

    /// <summary>
    /// Send a password reset link. Template key password_reset.
    /// </summary>
    public sealed class PasswordResetEmail : EmailTemplate
    {
        #region Public-Members

        /// <summary>
        /// Recipient first name.
        /// </summary>
        public string FirstName { get; set; } = String.Empty;

        /// <summary>
        /// Reset link.
        /// </summary>
        public string Link { get; set; } = String.Empty;

        #endregion

        #region Public-Methods

        /// <inheritdoc />
        public override string Key
        {
            get { return "password_reset"; }
        }

        /// <inheritdoc />
        public override EmailDocument Compose()
        {
            EmailDocument d = new EmailDocument { Subject = "Reset your Mux Cloud password", Preheader = "Choose a new password. The link expires in an hour.", Heading = "Reset your password" };
            d.Blocks.Add(new EmailParagraphBlock(Greeting(FirstName)));
            d.Blocks.Add(new EmailParagraphBlock("Someone asked to reset the password for this Mux Cloud account. If that was you, choose a new password below."));
            d.Blocks.Add(new EmailButtonBlock("Choose a new password", Link));
            d.Blocks.Add(new EmailCalloutBlock("The link works once and expires in 1 hour. Resetting signs you out everywhere. If you did not ask for this, ignore this email and your password stays the same.", EmailCalloutToneEnum.Info));
            return d;
        }

        #endregion
    }
}
