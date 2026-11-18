namespace MuxCloud.Core.Requests
{
    using System;
    using System.Text.Json.Serialization;

    /// <summary>
    /// Body of POST /v1.0/api/devices.
    /// </summary>
    public class DeviceRegisterRequest
    {
        #region Public-Members

        /// <summary>
        /// Expo push token, for example ExponentPushToken[xxxx].
        /// </summary>
        [JsonPropertyName("expoPushToken")]
        public string? ExpoPushToken { get; set; } = null;

        /// <summary>
        /// ios or android.
        /// </summary>
        [JsonPropertyName("platform")]
        public string? Platform { get; set; } = null;

        /// <summary>
        /// Display name, optional.
        /// </summary>
        [JsonPropertyName("name")]
        public string? Name { get; set; } = null;

        #endregion
    }
}
