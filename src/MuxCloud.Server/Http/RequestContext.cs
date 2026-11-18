namespace MuxCloud.Server.Http
{
    using System;
    using MuxCloud.Core.Helpers;
    using MuxCloud.Core.Models;

    /// <summary>
    /// Per-request state: caller identity, correlation, and what request history may capture. Stored in
    /// <c>HttpContextBase.Metadata</c>.
    /// </summary>
    public class RequestContext
    {
        #region Public-Members

        /// <summary>
        /// Request identifier (prefix req_).
        /// </summary>
        public string RequestId { get; } = IdGenerator.NewId(MuxCloud.Core.Constants.RequestPrefix);

        /// <summary>
        /// Requester IP.
        /// </summary>
        public string SourceIp { get; set; } = String.Empty;

        /// <summary>
        /// Requester user agent.
        /// </summary>
        public string UserAgent { get; set; } = String.Empty;

        /// <summary>
        /// Value of the Origin header, or empty.
        /// </summary>
        public string Origin { get; set; } = String.Empty;

        /// <summary>
        /// Authenticated caller, or null.
        /// </summary>
        public AuthenticatedPrincipal? Principal { get; set; } = null;

        /// <summary>
        /// How the caller authenticated.
        /// </summary>
        public AuthSchemeEnum AuthScheme { get; set; } = AuthSchemeEnum.None;

        /// <summary>
        /// Whether this request is relayed to a machine.
        /// </summary>
        public bool IsRelay { get; set; } = false;

        /// <summary>
        /// Route template for request history.
        /// </summary>
        public string PathTemplate { get; set; } = String.Empty;

        /// <summary>
        /// Whether bodies must not be captured (credentials, tokens, relay).
        /// </summary>
        public bool SkipBodyCapture { get; set; } = false;

        /// <summary>
        /// Request body read by the handler, for capture.
        /// </summary>
        public string CapturedRequestBody { get; set; } = String.Empty;

        /// <summary>
        /// Response body sent by the handler, for capture.
        /// </summary>
        public string CapturedResponseBody { get; set; } = String.Empty;

        /// <summary>
        /// Response bytes sent (relay).
        /// </summary>
        public long ResponseBytes { get; set; } = 0;

        /// <summary>
        /// The authenticated user, or null.
        /// </summary>
        public User? User
        {
            get { return Principal?.User; }
        }

        #endregion
    }
}
