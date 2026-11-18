namespace MuxCloud.Email
{
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Net;
    using System.Text.RegularExpressions;

    /// <summary>
    /// Colors and base inline styles a layout hands to its blocks, plus the encoding helpers every block uses.
    /// Thread safety: immutable after construction.
    /// </summary>
    public class EmailStyle
    {
        #region Public-Members

        /// <summary>
        /// Font stack.
        /// </summary>
        public const string FontFamily = "-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";

        /// <summary>
        /// Monospace font stack (code blocks).
        /// </summary>
        public const string MonospaceFamily = "SFMono-Regular,Consolas,'Liberation Mono',Menlo,monospace";

        /// <summary>
        /// Body text color (light scheme).
        /// </summary>
        public const string TextColor = "#1f2328";

        /// <summary>
        /// Secondary text color (light scheme).
        /// </summary>
        public const string MutedColor = "#59636e";

        /// <summary>
        /// Border and rule color (light scheme).
        /// </summary>
        public const string BorderColor = "#d0d7de";

        /// <summary>
        /// Subtle surface color for code blocks and callouts (light scheme).
        /// </summary>
        public const string SurfaceColor = "#f6f8fa";

        /// <summary>
        /// Brand primary color (validated hex).
        /// </summary>
        public string Primary { get; }

        /// <summary>
        /// Text color on the primary color (validated hex).
        /// </summary>
        public string OnPrimary { get; }

        /// <summary>
        /// Inline style of a body paragraph.
        /// </summary>
        public string Text
        {
            get { return "font-family:" + FontFamily + ";font-size:16px;line-height:1.5;color:" + TextColor + ";margin:0 0 16px"; }
        }

        /// <summary>
        /// Inline style of secondary text.
        /// </summary>
        public string Muted
        {
            get { return "font-family:" + FontFamily + ";font-size:13px;line-height:1.5;color:" + MutedColor + ";margin:0 0 8px"; }
        }

        #endregion

        #region Private-Members

        private static readonly Regex _Hex = new Regex("^#[0-9A-Fa-f]{3,8}$", RegexOptions.Compiled | RegexOptions.CultureInvariant);

        #endregion

        #region Constructors-and-Factories

        /// <summary>
        /// Instantiate from a brand.
        /// </summary>
        /// <param name="brand">Brand.</param>
        /// <exception cref="ArgumentNullException">brand is null.</exception>
        public EmailStyle(EmailBrand brand)
        {
            ArgumentNullException.ThrowIfNull(brand);
            Primary = Color(brand.PrimaryColor, "#111111");
            OnPrimary = Color(brand.OnPrimaryColor, "#FFFFFF");
        }

        #endregion

        #region Public-Methods

        /// <summary>
        /// HTML-encode text (null renders empty).
        /// </summary>
        /// <param name="text">Text.</param>
        /// <returns>Encoded text.</returns>
        public static string Encode(string? text)
        {
            return WebUtility.HtmlEncode(text ?? String.Empty);
        }

        /// <summary>
        /// HTML-encode multi-line text, turning line breaks into br elements.
        /// </summary>
        /// <param name="text">Text.</param>
        /// <returns>Encoded HTML.</returns>
        public static string EncodeLines(string? text)
        {
            IEnumerable<string> lines = (text ?? String.Empty).Replace("\r\n", "\n", StringComparison.Ordinal).Split('\n').Select(Encode);
            return String.Join("<br>", lines);
        }

        /// <summary>
        /// Whether a value is an absolute http or https URL.
        /// </summary>
        /// <param name="value">Value.</param>
        /// <returns>True for http(s).</returns>
        public static bool IsHttpUrl(string? value)
        {
            return Uri.TryCreate(value, UriKind.Absolute, out Uri? uri) && (uri.Scheme == Uri.UriSchemeHttps || uri.Scheme == Uri.UriSchemeHttp);
        }

        /// <summary>
        /// A hex color, or the fallback when the value is not one.
        /// </summary>
        /// <param name="value">Value.</param>
        /// <param name="fallback">Fallback.</param>
        /// <returns>Color.</returns>
        public static string Color(string? value, string fallback)
        {
            return value != null && _Hex.IsMatch(value) ? value : fallback;
        }

        #endregion
    }
}
