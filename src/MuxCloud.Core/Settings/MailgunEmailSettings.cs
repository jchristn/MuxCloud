namespace MuxCloud.Core.Settings
{
    using System;

    /// <summary>
    /// Mailgun provider settings.
    /// </summary>
    public class MailgunEmailSettings
    {
        #region Public-Members

        /// <summary>
        /// Sending domain. Default latticetech.ai.
        /// </summary>
        public string Domain
        {
            get { return _Domain; }
            set { _Domain = String.IsNullOrWhiteSpace(value) ? "latticetech.ai" : value.Trim(); }
        }

        /// <summary>
        /// API key. Secret. Set with MUXCLOUD_MAILGUN_API_KEY rather than in the file.
        /// </summary>
        public string ApiKey
        {
            get { return _ApiKey; }
            set { _ApiKey = value ?? String.Empty; }
        }

        /// <summary>
        /// API base URL. Default https://api.mailgun.net/v3/ (use https://api.eu.mailgun.net/v3/ for the EU region).
        /// </summary>
        public string BaseUrl
        {
            get { return _BaseUrl; }
            set { _BaseUrl = String.IsNullOrWhiteSpace(value) ? "https://api.mailgun.net/v3/" : value.Trim(); }
        }

        #endregion

        #region Private-Members

        private string _Domain = "latticetech.ai";
        private string _ApiKey = String.Empty;
        private string _BaseUrl = "https://api.mailgun.net/v3/";

        #endregion
    }
}
