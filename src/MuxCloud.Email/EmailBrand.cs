namespace MuxCloud.Email
{
    using System;

    /// <summary>
    /// Brand values of the email layout, from the email and server settings.
    /// </summary>
    public class EmailBrand
    {
        #region Public-Members

        /// <summary>
        /// Display name.
        /// </summary>
        public string Name { get; set; } = String.Empty;

        /// <summary>
        /// Absolute logo URL, or null.
        /// </summary>
        public string? LogoUrl { get; set; } = null;

        /// <summary>
        /// Primary color (#RRGGBB).
        /// </summary>
        public string PrimaryColor { get; set; } = "#111111";

        /// <summary>
        /// Text color on the primary color.
        /// </summary>
        public string OnPrimaryColor { get; set; } = "#FFFFFF";

        /// <summary>
        /// Support email, or empty.
        /// </summary>
        public string SupportEmail { get; set; } = String.Empty;

        /// <summary>
        /// Website base URL.
        /// </summary>
        public string WebUrl { get; set; } = String.Empty;

        /// <summary>
        /// Privacy policy URL, or null.
        /// </summary>
        public string? PrivacyUrl { get; set; } = null;

        /// <summary>
        /// Terms of service URL, or null.
        /// </summary>
        public string? TermsUrl { get; set; } = null;

        /// <summary>
        /// Email preferences URL, or null.
        /// </summary>
        public string? PreferencesUrl { get; set; } = null;

        /// <summary>
        /// Postal address for the footer, or empty (no address line is shown).
        /// </summary>
        public string PostalAddress { get; set; } = String.Empty;

        #endregion
    }
}
