namespace MuxCloud.Email.Templates
{
    using System;
    using System.Collections.Generic;
    using MuxCloud.Email.Blocks;

    /// <summary>
    /// Welcome a verified user and explain how to connect a machine. Template key welcome.
    /// </summary>
    public sealed class WelcomeEmail : EmailTemplate
    {
        #region Public-Members

        /// <summary>
        /// Recipient first name.
        /// </summary>
        public string FirstName { get; set; } = String.Empty;

        /// <summary>
        /// Dashboard URL.
        /// </summary>
        public string DashboardUrl { get; set; } = String.Empty;

        #endregion

        #region Public-Methods

        /// <inheritdoc />
        public override string Key
        {
            get { return "welcome"; }
        }

        /// <inheritdoc />
        public override EmailDocument Compose()
        {
            EmailDocument d = new EmailDocument { Subject = "Welcome to Mux Cloud", Preheader = "Connect a machine and pick up your conversations anywhere.", Heading = "You are all set" };
            d.Blocks.Add(new EmailParagraphBlock(Greeting(FirstName)));
            d.Blocks.Add(new EmailParagraphBlock("Your email is confirmed. To reach a machine from anywhere, sign in to Mux Cloud from mux on that machine:"));
            d.Blocks.Add(new EmailListBlock(new List<string>
            {
                "Terminal: run mux cloud login",
                "Desktop app or VS Code: open Mux Cloud and sign in",
                "Local dashboard: Settings, then Mux Cloud"
            }, true));
            d.Blocks.Add(new EmailParagraphBlock("Once it shows Connected, open Mux Cloud and pick the machine. You get its conversations exactly as if you were sitting at it."));
            d.Blocks.Add(new EmailButtonBlock("Open Mux Cloud", DashboardUrl) { ShowFallbackLink = false });
            return d;
        }

        #endregion
    }
}
