namespace MuxCloud.Core.Models
{
    using System;
    using MuxCloud.Core.Helpers;

    /// <summary>
    /// A mobile device registered for push notifications. The push token is stored but never returned by the API.
    /// </summary>
    public class Device
    {
        #region Public-Members

        /// <summary>
        /// Device identifier (prefix dev_).
        /// </summary>
        public string Id { get; set; } = IdGenerator.NewId(Constants.DevicePrefix);

        /// <summary>
        /// Tenant.
        /// </summary>
        public string TenantId { get; set; } = String.Empty;

        /// <summary>
        /// Owning user.
        /// </summary>
        public string UserId { get; set; } = String.Empty;

        /// <summary>
        /// Expo push token. Secret to the user; never returned.
        /// </summary>
        public string ExpoPushToken { get; set; } = String.Empty;

        /// <summary>
        /// ios or android.
        /// </summary>
        public string Platform { get; set; } = "ios";

        /// <summary>
        /// Display name, for example the device model.
        /// </summary>
        public string Name { get; set; } = String.Empty;

        /// <summary>
        /// Registration time, UTC.
        /// </summary>
        public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Last update time, UTC.
        /// </summary>
        public DateTime LastUpdateUtc { get; set; } = DateTime.UtcNow;

        #endregion
    }
}
