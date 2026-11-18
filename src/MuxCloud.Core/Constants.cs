namespace MuxCloud.Core
{
    using System.Collections.Generic;

    /// <summary>
    /// Identifier prefixes, feature keys, and other fixed values.
    /// Thread safety: immutable; safe to share.
    /// </summary>
    public static class Constants
    {
        #region Public-Members

        /// <summary>
        /// Product name.
        /// </summary>
        public const string ProductName = "MuxCloud";

        /// <summary>
        /// Product version.
        /// </summary>
        public const string Version = "0.1.0-alpha";

        /// <summary>
        /// Account identifier prefix.
        /// </summary>
        public const string AccountPrefix = "acct_";

        /// <summary>
        /// Tenant identifier prefix.
        /// </summary>
        public const string TenantPrefix = "ten_";

        /// <summary>
        /// User identifier prefix.
        /// </summary>
        public const string UserPrefix = "usr_";

        /// <summary>
        /// Session identifier prefix.
        /// </summary>
        public const string SessionPrefix = "ses_";

        /// <summary>
        /// One-time token record identifier prefix.
        /// </summary>
        public const string OneTimeTokenPrefix = "ott_";

        /// <summary>
        /// Email verification token value prefix.
        /// </summary>
        public const string EmailVerificationTokenPrefix = "evf_";

        /// <summary>
        /// Password reset token value prefix.
        /// </summary>
        public const string PasswordResetTokenPrefix = "pwr_";

        /// <summary>
        /// Machine identifier prefix.
        /// </summary>
        public const string MachinePrefix = "mch_";

        /// <summary>
        /// Machine connection identifier prefix.
        /// </summary>
        public const string ConnectionPrefix = "mcn_";

        /// <summary>
        /// Plan identifier prefix.
        /// </summary>
        public const string PlanPrefix = "pln_";

        /// <summary>
        /// Plan feature identifier prefix.
        /// </summary>
        public const string PlanFeaturePrefix = "pfe_";

        /// <summary>
        /// Subscription identifier prefix.
        /// </summary>
        public const string SubscriptionPrefix = "sub_";

        /// <summary>
        /// Entitlement override identifier prefix.
        /// </summary>
        public const string EntitlementOverridePrefix = "eno_";

        /// <summary>
        /// Audit record identifier prefix.
        /// </summary>
        public const string AuditPrefix = "aud_";

        /// <summary>
        /// Request history identifier prefix.
        /// </summary>
        public const string RequestPrefix = "req_";

        /// <summary>
        /// Relay stream identifier prefix.
        /// </summary>
        public const string StreamPrefix = "str_";

        /// <summary>
        /// Relay channel identifier prefix.
        /// </summary>
        public const string ChannelPrefix = "chn_";

        /// <summary>
        /// WebSocket ticket prefix.
        /// </summary>
        public const string WsTicketPrefix = "wst_";

        /// <summary>
        /// Access token prefix.
        /// </summary>
        public const string AccessTokenPrefix = "mca_";

        /// <summary>
        /// Refresh token prefix.
        /// </summary>
        public const string RefreshTokenPrefix = "mcr_";

        /// <summary>
        /// Feature: use the web dashboard and relay from a browser.
        /// </summary>
        public const string FeatureWebAccess = "web.access";

        /// <summary>
        /// Feature: use the mobile app.
        /// </summary>
        public const string FeatureMobileAccess = "mobile.access";

        /// <summary>
        /// Feature: maximum enrolled machines.
        /// </summary>
        public const string FeatureMachinesMax = "machines.max";

        /// <summary>
        /// Feature: maximum concurrent relay streams per tunnel.
        /// </summary>
        public const string FeatureConcurrentStreamsMax = "relay.concurrentStreams.max";

        /// <summary>
        /// Every known feature key.
        /// </summary>
        public static readonly IReadOnlyList<string> FeatureKeys = new List<string> { FeatureWebAccess, FeatureMobileAccess, FeatureMachinesMax, FeatureConcurrentStreamsMax };

        /// <summary>
        /// Code of the plan new accounts are subscribed to.
        /// </summary>
        public const string FreePlanCode = "free";

        /// <summary>
        /// Session cookie name (access token).
        /// </summary>
        public const string SessionCookieName = "muxcloud_session";

        /// <summary>
        /// Refresh cookie name.
        /// </summary>
        public const string RefreshCookieName = "muxcloud_refresh";

        /// <summary>
        /// Password hash algorithm identifier.
        /// </summary>
        public const string PasswordAlgorithm = "pbkdf2-sha256";

        #endregion
    }
}
