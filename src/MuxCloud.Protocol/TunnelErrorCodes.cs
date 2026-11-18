namespace MuxCloud.Protocol
{
    /// <summary>
    /// Stable error codes carried in <see cref="TunnelErrorPayload.Code"/> and in relay error responses.
    /// Thread safety: immutable; safe to share.
    /// </summary>
    public static class TunnelErrorCodes
    {
        #region Public-Members

        /// <summary>
        /// The relayed request was malformed.
        /// </summary>
        public const string BadRequest = "bad_request";

        /// <summary>
        /// A request body exceeded the negotiated maximum.
        /// </summary>
        public const string BodyTooLarge = "body_too_large";

        /// <summary>
        /// The machine could not reach its own local mux API.
        /// </summary>
        public const string LoopbackFailed = "loopback_failed";

        /// <summary>
        /// The relayed request timed out.
        /// </summary>
        public const string Timeout = "timeout";

        /// <summary>
        /// The relayed request was canceled.
        /// </summary>
        public const string Canceled = "canceled";

        /// <summary>
        /// The stream or channel identifier is unknown.
        /// </summary>
        public const string NotFound = "not_found";

        /// <summary>
        /// The machine's policy refused the request.
        /// </summary>
        public const string PolicyDenied = "policy_denied";

        /// <summary>
        /// The machine is not connected to the cloud.
        /// </summary>
        public const string MachineOffline = "machine_offline";

        /// <summary>
        /// The tunnel already carries the maximum number of concurrent streams.
        /// </summary>
        public const string TooManyStreams = "too_many_streams";

        /// <summary>
        /// An unexpected failure.
        /// </summary>
        public const string InternalError = "internal_error";

        #endregion
    }
}
