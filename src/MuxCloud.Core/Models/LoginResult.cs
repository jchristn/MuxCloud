namespace MuxCloud.Core.Models
{
    using System;

    /// <summary>
    /// Outcome of a successful login or refresh.
    /// </summary>
    public class LoginResult
    {
        #region Public-Members

        /// <summary>
        /// User.
        /// </summary>
        public User User { get; set; } = new User();

        /// <summary>
        /// Session.
        /// </summary>
        public AuthSession Session { get; set; } = new AuthSession();

        /// <summary>
        /// Access token.
        /// </summary>
        public string AccessToken { get; set; } = String.Empty;

        /// <summary>
        /// Access token expiry.
        /// </summary>
        public DateTime AccessTokenExpiresUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Refresh token.
        /// </summary>
        public string RefreshToken { get; set; } = String.Empty;

        /// <summary>
        /// Refresh token expiry.
        /// </summary>
        public DateTime RefreshTokenExpiresUtc { get; set; } = DateTime.UtcNow;

        #endregion
    }
}
