namespace MuxCloud.Core.Settings
{
    using System;
    using System.Collections.Generic;

    /// <summary>
    /// Public identity and static content settings.
    /// </summary>
    public class ServerSettings
    {
        #region Public-Members

        /// <summary>
        /// Public origin of the service, used for Origin checks, cookie security, and links in email.
        /// Default http://127.0.0.1:8800. Production: https://app.usemux.ai.
        /// </summary>
        public string PublicUrl
        {
            get { return _PublicUrl; }
            set { _PublicUrl = String.IsNullOrWhiteSpace(value) ? "http://127.0.0.1:8800" : value.Trim().TrimEnd('/'); }
        }

        /// <summary>
        /// Name of this server node, recorded on machine connections. Default node-1.
        /// </summary>
        public string NodeId
        {
            get { return _NodeId; }
            set { _NodeId = String.IsNullOrWhiteSpace(value) ? "node-1" : value; }
        }

        /// <summary>
        /// Directory holding the built dashboard single-page app. Default ./dashboard (relative to the working directory).
        /// When it has no index.html, the server serves only the API.
        /// </summary>
        public string DashboardDirectory
        {
            get { return _DashboardDirectory; }
            set { _DashboardDirectory = String.IsNullOrWhiteSpace(value) ? "./dashboard" : value; }
        }

        /// <summary>
        /// Whether to take the client IP and scheme from X-Forwarded-For and X-Forwarded-Proto. Enable only behind a trusted reverse proxy. Default false.
        /// </summary>
        public bool TrustForwardedHeaders { get; set; } = false;

        /// <summary>
        /// Extra browser origins allowed besides <see cref="PublicUrl"/>, for example a dashboard dev server at
        /// http://127.0.0.1:5173. Requests from these origins pass the Origin check and receive CORS headers with credentials.
        /// </summary>
        public List<string> AdditionalOrigins
        {
            get { return _AdditionalOrigins; }
            set { _AdditionalOrigins = value ?? new List<string>(); }
        }

        #endregion

        #region Private-Members

        private string _PublicUrl = "http://127.0.0.1:8800";
        private string _NodeId = "node-1";
        private string _DashboardDirectory = "./dashboard";
        private List<string> _AdditionalOrigins = new List<string>();

        #endregion
    }
}
