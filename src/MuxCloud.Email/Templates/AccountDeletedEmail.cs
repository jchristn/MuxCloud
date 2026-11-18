namespace MuxCloud.Email.Templates
{
    using System;
    using System.Collections.Generic;
    using MuxCloud.Email.Blocks;

    /// <summary>
    /// Confirm an account deletion. Template key account_deleted.
    /// </summary>
    public sealed class AccountDeletedEmail : EmailTemplate
    {
        #region Public-Members

        /// <summary>
        /// Recipient first name.
        /// </summary>
        public string FirstName { get; set; } = String.Empty;

        /// <summary>
        /// Support address.
        /// </summary>
        public string SupportAddress { get; set; } = String.Empty;

        #endregion

        #region Public-Methods

        /// <inheritdoc />
        public override string Key
        {
            get { return "account_deleted"; }
        }

        /// <inheritdoc />
        public override EmailDocument Compose()
        {
            EmailDocument d = new EmailDocument { Subject = "Your Mux Cloud account was deleted", Preheader = "Your machines were disconnected and your account data removed.", Heading = "Your account was deleted" };
            d.Blocks.Add(new EmailParagraphBlock(Greeting(FirstName)));
            d.Blocks.Add(new EmailParagraphBlock("Your Mux Cloud account and its machine list were deleted, and every machine was disconnected. Conversations were never stored by Mux Cloud; they remain on your machines."));
            d.Blocks.Add(new EmailParagraphBlock("If you did not ask for this, email " + SupportAddress + "."));
            return d;
        }

        #endregion
    }
}
