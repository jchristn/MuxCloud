namespace MuxCloud.Core.Settings
{
    using System;

    /// <summary>
    /// Seed administrator settings, applied on first boot only.
    /// </summary>
    public class AdminSettings
    {
        #region Public-Members

        /// <summary>
        /// Administrator email. Default admin@muxcloud.local. Override with MUXCLOUD_ADMIN_EMAIL.
        /// </summary>
        public string Email
        {
            get { return _Email; }
            set { _Email = String.IsNullOrWhiteSpace(value) ? "admin@muxcloud.local" : value.Trim(); }
        }

        /// <summary>
        /// Administrator password. Secret. When empty on first boot, a random password is generated and logged once.
        /// Override with MUXCLOUD_ADMIN_PASSWORD.
        /// </summary>
        public string Password
        {
            get { return _Password; }
            set { _Password = value ?? String.Empty; }
        }

        #endregion

        #region Private-Members

        private string _Email = "admin@muxcloud.local";
        private string _Password = String.Empty;

        #endregion
    }
}
