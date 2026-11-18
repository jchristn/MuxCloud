namespace MuxCloud.Email.Blocks
{
    using System;

    /// <summary>
    /// A call-to-action button with a copy-the-link fallback line. Only absolute http(s) URLs render; anything else renders
    /// nothing.
    /// </summary>
    public class EmailButtonBlock : EmailBlock
    {
        #region Public-Members

        /// <summary>
        /// Button label.
        /// </summary>
        public string Label { get; }

        /// <summary>
        /// Target URL.
        /// </summary>
        public string Url { get; }

        /// <summary>
        /// Whether to show the "If the button does not work" line under the button. Default true.
        /// </summary>
        public bool ShowFallbackLink { get; set; } = true;

        #endregion

        #region Constructors-and-Factories

        /// <summary>
        /// Instantiate.
        /// </summary>
        /// <param name="label">Label.</param>
        /// <param name="url">Absolute http(s) URL.</param>
        public EmailButtonBlock(string? label, string? url)
        {
            Label = (label ?? String.Empty).Trim();
            Url = (url ?? String.Empty).Trim();
        }

        #endregion

        #region Public-Methods

        /// <inheritdoc />
        public override string RenderHtml(EmailStyle style)
        {
            ArgumentNullException.ThrowIfNull(style);
            if (!Renders) return String.Empty;
            string href = EmailStyle.Encode(Url);
            string html = "<p style=\"margin:8px 0 24px\"><a href=\"" + href + "\" style=\"display:inline-block;background:" + style.Primary + ";color:" + style.OnPrimary +
                ";text-decoration:none;font-weight:600;padding:12px 20px;border-radius:6px;font-family:" + EmailStyle.FontFamily + "\">" + EmailStyle.Encode(Label) + "</a></p>";
            if (ShowFallbackLink)
                html += "<p class=\"muted\" style=\"" + style.Muted + "\">" + EmailStyle.Encode("If the button does not work, copy this link into your browser: ") +
                    "<a href=\"" + href + "\" style=\"color:" + style.Primary + ";word-break:break-all\">" + href + "</a></p>";
            return html;
        }

        /// <inheritdoc />
        public override string RenderText()
        {
            return Renders ? Label + ": " + Url : String.Empty;
        }

        #endregion

        #region Private-Members

        private bool Renders
        {
            get { return Label.Length > 0 && EmailStyle.IsHttpUrl(Url); }
        }

        #endregion
    }
}
