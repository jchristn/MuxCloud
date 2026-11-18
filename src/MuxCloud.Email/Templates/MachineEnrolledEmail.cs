namespace MuxCloud.Email.Templates
{
    using System;
    using System.Collections.Generic;
    using MuxCloud.Email.Blocks;

    /// <summary>
    /// Security notice: a new machine was connected. Template key machine_enrolled.
    /// </summary>
    public sealed class MachineEnrolledEmail : EmailTemplate
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

        /// <summary>
        /// Host name.
        /// </summary>
        public string Hostname { get; set; } = String.Empty;

        /// <summary>
        /// Operating system.
        /// </summary>
        public string Os { get; set; } = String.Empty;

        /// <summary>
        /// IP address of the enrollment.
        /// </summary>
        public string SourceIp { get; set; } = String.Empty;

        /// <summary>
        /// When the machine was connected, UTC.
        /// </summary>
        public DateTime EnrolledUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Link to review and revoke the machine.
        /// </summary>
        public string ReviewLink { get; set; } = String.Empty;

        #endregion

        #region Public-Methods

        /// <inheritdoc />
        public override string Key
        {
            get { return "machine_enrolled"; }
        }

        /// <inheritdoc />
        public override EmailDocument Compose()
        {
            EmailDocument d = new EmailDocument { Subject = "New machine connected to Mux Cloud: " + MachineName, Preheader = "A machine was just connected to your account.", Heading = "A new machine was connected" };
            d.Blocks.Add(new EmailParagraphBlock(Greeting(FirstName)));
            d.Blocks.Add(new EmailParagraphBlock("A machine was connected to your Mux Cloud account. Anyone signed in to your account can now use mux on it, including approving tools."));
            d.Blocks.Add(new EmailFieldsBlock(new List<EmailField>
            {
                new EmailField("Machine", MachineName),
                new EmailField("Host", Hostname),
                new EmailField("System", Os),
                new EmailField("From IP", SourceIp),
                new EmailField("When", EnrolledUtc.ToString("yyyy-MM-dd HH:mm", System.Globalization.CultureInfo.InvariantCulture) + " UTC")
            }));
            d.Blocks.Add(new EmailCalloutBlock("Not you? Revoke the machine and change your password now.", EmailCalloutToneEnum.Warning));
            d.Blocks.Add(new EmailButtonBlock("Review machine", ReviewLink));
            return d;
        }

        #endregion
    }
}
