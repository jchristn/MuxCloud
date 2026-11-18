namespace MuxCloud.Email.Templates
{
    using System;
    using System.Collections.Generic;
    using MuxCloud.Email.Blocks;

    /// <summary>
    /// Tell a user their password changed. Template key password_changed.
    /// </summary>
    public sealed class PasswordChangedEmail : EmailTemplate
    {
        #region Public-Members

        /// <summary>
        /// Recipient first name.
        /// </summary>
        public string FirstName { get; set; } = String.Empty;

        /// <summary>
        /// When the change happened, UTC.
        /// </summary>
        public DateTime ChangedUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Support address.
        /// </summary>
        public string SupportAddress { get; set; } = String.Empty;

        #endregion

        #region Public-Methods

        /// <inheritdoc />
        public override string Key
        {
            get { return "password_changed"; }
        }

        /// <inheritdoc />
        public override EmailDocument Compose()
        {
            EmailDocument d = new EmailDocument { Subject = "Your Mux Cloud password changed", Preheader = "If this was not you, contact us right away.", Heading = "Your password changed" };
            d.Blocks.Add(new EmailParagraphBlock(Greeting(FirstName)));
            d.Blocks.Add(new EmailParagraphBlock("The password for your Mux Cloud account was changed on " + ChangedUtc.ToString("yyyy-MM-dd HH:mm", System.Globalization.CultureInfo.InvariantCulture) + " UTC. Other sessions were signed out."));
            d.Blocks.Add(new EmailCalloutBlock("If you did not make this change, reset your password now and email " + SupportAddress + ". Anyone with your password can operate your connected machines.", EmailCalloutToneEnum.Warning));
            return d;
        }

        #endregion
    }
}
