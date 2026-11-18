namespace MuxCloud.Core.Services
{
    using MuxCloud.Core.Models;

    /// <summary>
    /// Outcome of a device registration.
    /// </summary>
    public class DeviceRegistration
    {
        #region Public-Members

        /// <summary>
        /// Device.
        /// </summary>
        public Device Device { get; set; } = new Device();

        /// <summary>
        /// True when a new device was created; false when the token was already registered.
        /// </summary>
        public bool Created { get; set; } = false;

        #endregion
    }
}
