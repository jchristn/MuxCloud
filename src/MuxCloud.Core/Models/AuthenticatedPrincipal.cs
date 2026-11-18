namespace MuxCloud.Core.Models
{
    using System;

    /// <summary>
    /// A validated caller.
    /// </summary>
    public class AuthenticatedPrincipal
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

        #endregion
    }
}
