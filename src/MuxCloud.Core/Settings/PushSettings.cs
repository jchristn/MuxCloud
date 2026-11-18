namespace MuxCloud.Core.Settings
{
    using System;

    /// <summary>
    /// Mobile push notification settings.
    /// </summary>
    public class PushSettings
    {
        #region Public-Members

        /// <summary>
        /// Send push notifications for approval_requested and run_completed machine status pushes. Default true.
        /// </summary>
        public bool Enabled { get; set; } = true;

        /// <summary>
        /// Expo access token, required only when Expo enhanced push security is on. Secret. Set with MUXCLOUD_EXPO_ACCESS_TOKEN.
        /// </summary>
        public string ExpoAccessToken
        {
            get { return _ExpoAccessToken; }
            set { _ExpoAccessToken = value ?? String.Empty; }
        }

        /// <summary>
        /// Expo push send endpoint. Default https://exp.host/--/api/v2/push/send.
        /// </summary>
        public string ExpoUrl
        {
            get { return _ExpoUrl; }
            set { _ExpoUrl = String.IsNullOrWhiteSpace(value) ? "https://exp.host/--/api/v2/push/send" : value.Trim(); }
        }

        /// <summary>
        /// Most devices one user may register. Default 20, minimum 1, maximum 1000.
        /// </summary>
        public int MaxDevicesPerUser
        {
            get { return _MaxDevicesPerUser; }
            set { _MaxDevicesPerUser = Math.Clamp(value, 1, 1000); }
        }

        #endregion

        #region Private-Members

        private string _ExpoAccessToken = String.Empty;
        private string _ExpoUrl = "https://exp.host/--/api/v2/push/send";
        private int _MaxDevicesPerUser = 20;

        #endregion
    }
}
