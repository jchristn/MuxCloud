namespace MuxCloud.Core.Settings
{
    using System;

    /// <summary>
    /// Authentication settings.
    /// </summary>
    public class AuthSettings
    {
        #region Public-Members

        /// <summary>
        /// Secret used to derive the token and machine-secret encryption keys. Secret; at least 32 characters. Generated
        /// on first boot when empty. Override with MUXCLOUD_AUTH_SIGNING_KEY. Changing it invalidates every access token and
        /// every machine secret.
        /// </summary>
        public string SigningKey
        {
            get { return _SigningKey; }
            set { _SigningKey = value ?? String.Empty; }
        }

        /// <summary>
        /// Access token lifetime in minutes. Default 60, minimum 5, maximum 1440.
        /// </summary>
        public int AccessTokenMinutes
        {
            get { return _AccessTokenMinutes; }
            set { _AccessTokenMinutes = Math.Clamp(value, 5, 1440); }
        }

        /// <summary>
        /// Refresh token lifetime in days. Default 30, minimum 1, maximum 365.
        /// </summary>
        public int RefreshTokenDays
        {
            get { return _RefreshTokenDays; }
            set { _RefreshTokenDays = Math.Clamp(value, 1, 365); }
        }

        /// <summary>
        /// PBKDF2-SHA256 iterations for new password hashes. Default 600000, minimum 1000 (tests), maximum 10000000.
        /// </summary>
        public int PasswordIterations
        {
            get { return _PasswordIterations; }
            set { _PasswordIterations = Math.Clamp(value, 1000, 10000000); }
        }

        /// <summary>
        /// Minimum password length. Default 10, minimum 8, maximum 128.
        /// </summary>
        public int MinimumPasswordLength
        {
            get { return _MinimumPasswordLength; }
            set { _MinimumPasswordLength = Math.Clamp(value, 8, 128); }
        }

        /// <summary>
        /// Failed logins per email before a lockout. Default 10, minimum 1, maximum 1000.
        /// </summary>
        public int MaxLoginFailures
        {
            get { return _MaxLoginFailures; }
            set { _MaxLoginFailures = Math.Clamp(value, 1, 1000); }
        }

        /// <summary>
        /// Window in which failures are counted, in seconds. Default 900, minimum 10, maximum 86400.
        /// </summary>
        public int LoginFailureWindowSeconds
        {
            get { return _LoginFailureWindowSeconds; }
            set { _LoginFailureWindowSeconds = Math.Clamp(value, 10, 86400); }
        }

        /// <summary>
        /// Lockout duration in seconds. Default 900, minimum 10, maximum 86400.
        /// </summary>
        public int LockoutSeconds
        {
            get { return _LockoutSeconds; }
            set { _LockoutSeconds = Math.Clamp(value, 10, 86400); }
        }

        /// <summary>
        /// Requests per IP per hour to signup, resend-verification, and forgot-password. Default 30, minimum 1, maximum 100000.
        /// </summary>
        public int AnonymousRequestsPerHour
        {
            get { return _AnonymousRequestsPerHour; }
            set { _AnonymousRequestsPerHour = Math.Clamp(value, 1, 100000); }
        }

        /// <summary>
        /// Whether a user must verify their email before signing in or enrolling a machine. Default true.
        /// </summary>
        public bool RequireEmailVerification { get; set; } = true;

        /// <summary>
        /// Version of the terms of service recorded when a user accepts them.
        /// </summary>
        public string TermsVersion
        {
            get { return _TermsVersion; }
            set { _TermsVersion = String.IsNullOrWhiteSpace(value) ? "2026-11-17" : value; }
        }

        #endregion

        #region Private-Members

        private string _SigningKey = String.Empty;
        private int _AccessTokenMinutes = 60;
        private int _RefreshTokenDays = 30;
        private int _PasswordIterations = 600000;
        private int _MinimumPasswordLength = 10;
        private int _MaxLoginFailures = 10;
        private int _LoginFailureWindowSeconds = 900;
        private int _LockoutSeconds = 900;
        private int _AnonymousRequestsPerHour = 30;
        private string _TermsVersion = "2026-11-17";

        #endregion
    }
}
