namespace MuxCloud.Email.Templates
{
    using System;
    using System.Collections.Generic;
    using MuxCloud.Email.Blocks;

    /// <summary>
    /// Tell a user a machine was revoked. Template key machine_revoked.
    /// </summary>
    public sealed class MachineRevokedEmail : EmailTemplate
    {
        #region Public-Members

        /// <summary>
        /// Recipient first name.
        /// </summary>
        public string FirstName { get; set; } = String.Empty;

        /// <summary>
        /// Machine name.
        /// </summary>
        public string MachineName { get; set; } = String.Empty;

        #endregion

        #region Public-Methods

        /// <inheritdoc />
        public override string Key
        {
            get { return "machine_revoked"; }
        }

        /// <inheritdoc />
        public override EmailDocument Compose()
        {
            EmailDocument d = new EmailDocument { Subject = "Machine removed from Mux Cloud: " + MachineName, Preheader = "It can no longer connect until it signs in again.", Heading = "A machine was revoked" };
            d.Blocks.Add(new EmailParagraphBlock(Greeting(FirstName)));
            d.Blocks.Add(new EmailParagraphBlock(MachineName + " was revoked and disconnected from your Mux Cloud account. To use it remotely again, sign in to Mux Cloud from mux on that machine."));
            return d;
        }

        #endregion
    }
}
