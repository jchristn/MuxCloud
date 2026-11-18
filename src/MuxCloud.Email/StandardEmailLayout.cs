namespace MuxCloud.Email
{
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Text;
    using HtmlPageBuilder;

    /// <summary>
    /// The Mux Cloud email layout (modeled on TrellisKit's): a complete, inline-styled HTML document with the logo, heading, body blocks,
    /// and brand footer, plus a matching plain-text version. Works in light and dark mail clients (color-scheme meta and
    /// a prefers-color-scheme style) and at 360 px wide (fluid, max 600 px). The postal address line appears only when an
    /// address is configured.
    /// Built with HtmlPageBuilder; every value is encoded.
    /// Thread safety: stateless; safe to share.
    /// </summary>
    public class StandardEmailLayout
    {
        #region Public-Members

        /// <summary>
        /// Shared instance.
        /// </summary>
        public static readonly StandardEmailLayout Instance = new StandardEmailLayout();

        #endregion

        #region Public-Methods

        /// <summary>
        /// Render a document in a brand.
        /// </summary>
        /// <param name="document">Document.</param>
        /// <param name="brand">Brand.</param>
        /// <returns>Subject, preheader, HTML, and text.</returns>
        /// <exception cref="ArgumentNullException">An argument is null.</exception>
        public EmailRendered Render(EmailDocument document, EmailBrand brand)
        {
            ArgumentNullException.ThrowIfNull(document);
            ArgumentNullException.ThrowIfNull(brand);
            EmailStyle style = new EmailStyle(brand);
            return new EmailRendered
            {
                Subject = OneLine(document.Subject),
                Preheader = OneLine(document.Preheader),
                Html = Html(document, brand, style),
                Text = Text(document, brand)
            };
        }

        #endregion

        #region Private-Methods

        private static string OneLine(string? text)
        {
            return (text ?? String.Empty).Replace("\r", " ", StringComparison.Ordinal).Replace("\n", " ", StringComparison.Ordinal).Trim();
        }

        private static string Html(EmailDocument document, EmailBrand brand, EmailStyle style)
        {
            string primary = style.Primary;
            string css = "body{margin:0;padding:0;background:#f4f5f7}.card{background:#ffffff}a{color:" + primary + "}" +
                ".preheader{display:none!important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;mso-hide:all}" +
                "@media (prefers-color-scheme: dark){body,.outer{background:#111315!important}.card{background:#1d2125!important}" +
                "h1,h2,p,li,td,.text{color:#e6edf3!important}.muted{color:#9aa4ae!important}" +
                ".code,.callout{background:#161b22!important;color:#e6edf3!important;border-color:#30363d!important}.fields td{border-color:#30363d!important}}" +
                "@media only screen and (max-width:480px){.card{padding:20px!important}h1{font-size:20px!important}}";
            string muted = style.Muted;
            using (Html builder = new Html())
            {
                HtmlBody b = builder.Body();
                StringBuilder inner = new StringBuilder();
                if (!String.IsNullOrWhiteSpace(brand.LogoUrl) && EmailStyle.IsHttpUrl(brand.LogoUrl))
                    inner.Append(b.ParagraphHtml(b.Image(brand.Name, brand.LogoUrl!, style: "max-height:48px;max-width:200px;border:0"), style: "margin:0 0 24px"));
                string heading = OneLine(document.Heading);
                if (heading.Length > 0)
                    inner.Append(b.H1Text(heading, style: "font-family:" + EmailStyle.FontFamily + ";font-size:22px;line-height:1.3;color:" + EmailStyle.TextColor + ";margin:0 0 16px"));
                foreach (EmailBlock block in document.Blocks.Where(x => x != null)) inner.Append(block.RenderHtml(style));

                StringBuilder footer = new StringBuilder();
                footer.Append(b.ParagraphText(brand.Name, classId: "muted", style: muted + ";font-weight:600"));
                if (!String.IsNullOrWhiteSpace(brand.SupportEmail))
                    footer.Append(b.ParagraphHtml(builder.Text("Questions? ").ToString() + b.LinkText(brand.SupportEmail.Trim(), "mailto:" + brand.SupportEmail.Trim(), false, style: "color:" + primary), classId: "muted", style: muted));
                if (!String.IsNullOrWhiteSpace(brand.PostalAddress))
                    footer.Append(b.ParagraphText(brand.PostalAddress.Trim(), classId: "muted", style: muted));
                List<string> links = new List<string>();
                if (brand.PrivacyUrl != null && EmailStyle.IsHttpUrl(brand.PrivacyUrl)) links.Add(b.LinkText("Privacy policy", brand.PrivacyUrl, false, style: "color:" + primary));
                if (brand.TermsUrl != null && EmailStyle.IsHttpUrl(brand.TermsUrl)) links.Add(b.LinkText("Terms of service", brand.TermsUrl, false, style: "color:" + primary));
                if (brand.PreferencesUrl != null && EmailStyle.IsHttpUrl(brand.PreferencesUrl)) links.Add(b.LinkText("Email preferences", brand.PreferencesUrl, false, style: "color:" + primary));
                if (links.Count > 0) footer.Append(b.ParagraphHtml(String.Join(builder.Text(" | ").ToString(), links), classId: "muted", style: muted));

                string card = b.DivHtml(inner.ToString() + b.ElementHtml("hr", String.Empty, style: "border:0;border-top:1px solid " + EmailStyle.BorderColor + ";margin:24px 0") + footer.ToString(),
                    classId: "card", style: "max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;padding:32px;box-sizing:border-box");
                string preheader = OneLine(document.Preheader);
                return builder.Page()
                    .WithLanguage("en")
                    .WithTitle(OneLine(document.Subject))
                    .WithHead(h => h
                        .AddRawElement("<meta charset=\"utf-8\">")
                        .AddRawElement("<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">")
                        .AddRawElement("<meta name=\"color-scheme\" content=\"light dark\">")
                        .AddRawElement("<meta name=\"supported-color-schemes\" content=\"light dark\">")
                        .WithStyle(css))
                    .WithBody(body => body
                        .AddRaw(body.ElementText("span", preheader, classId: "preheader", style: "display:none;max-height:0;overflow:hidden"))
                        .AddDivHtml(card, classId: "outer", style: "background:#f4f5f7;padding:24px 12px"))
                    .ToString();
            }
        }

        private static string Text(EmailDocument document, EmailBrand brand)
        {
            StringBuilder text = new StringBuilder();
            string heading = OneLine(document.Heading);
            if (heading.Length > 0) text.Append(heading).Append("\n\n");
            foreach (EmailBlock block in document.Blocks.Where(b => b != null))
            {
                string part = block.RenderText();
                if (part.Trim().Length > 0) text.Append(part).Append("\n\n");
            }
            text.Append("-- \n").Append(brand.Name).Append('\n');
            if (!String.IsNullOrWhiteSpace(brand.SupportEmail)) text.Append(brand.SupportEmail.Trim()).Append('\n');
            if (!String.IsNullOrWhiteSpace(brand.PostalAddress)) text.Append(brand.PostalAddress.Trim()).Append('\n');
            if (brand.PreferencesUrl != null) text.Append("Email preferences: ").Append(brand.PreferencesUrl).Append('\n');
            return text.ToString();
        }

        #endregion
    }
}
