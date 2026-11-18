namespace MuxCloud.Core.Responses
{
    using System;
    using System.Text.Json.Serialization;

    /// <summary>
    /// Response of POST /v1.0/api/machines/enroll.
    /// </summary>
    public class EnrollResponse
    {
        #region Public-Members

        /// <summary>
        /// Machine identifier.
        /// </summary>
        [JsonPropertyName("machineId")]
        public string MachineId { get; set; } = String.Empty;

        /// <summary>
        /// Machine secret, shown once.
        /// </summary>
        [JsonPropertyName("machineSecret")]
        public string MachineSecret { get; set; } = String.Empty;

        /// <summary>
        /// Name.
        /// </summary>
        [JsonPropertyName("machineName")]
        public string MachineName { get; set; } = String.Empty;

        #endregion
    }
}
