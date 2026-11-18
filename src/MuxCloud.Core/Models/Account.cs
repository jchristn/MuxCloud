namespace MuxCloud.Core.Models
{
    using System;
    using MuxCloud.Core.Helpers;

    /// <summary>
    /// A billing owner. One per signup; sits above the user's tenant.
    /// </summary>
    public class Account
    {
        #region Public-Members

        /// <summary>
        /// Account identifier (prefix acct_).
        /// </summary>
        public string Id { get; set; } = IdGenerator.NewId(Constants.AccountPrefix);

        /// <summary>
        /// Display name.
        /// </summary>
        public string Name { get; set; } = String.Empty;

        /// <summary>
        /// User who owns the account.
        /// </summary>
        public string OwnerUserId { get; set; } = String.Empty;

        /// <summary>
        /// Whether the account is active.
        /// </summary>
        public bool Active { get; set; } = true;

        /// <summary>
        /// Whether the account is protected from deletion (system account).
        /// </summary>
        public bool IsProtected { get; set; } = false;

        /// <summary>
        /// Creation time, UTC.
        /// </summary>
        public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Last update time, UTC.
        /// </summary>
        public DateTime LastUpdateUtc { get; set; } = DateTime.UtcNow;

        #endregion
    }
}
