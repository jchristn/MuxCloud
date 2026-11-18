namespace MuxCloud.Core.Settings
{
    /// <summary>
    /// Telemetry settings for Watson's built-in instrumentation and the MuxCloud meter and activity source.
    /// </summary>
    public class TelemetrySettings
    {
        #region Public-Members

        /// <summary>
        /// Enable telemetry. Default true.
        /// </summary>
        public bool Enable { get; set; } = true;

        /// <summary>
        /// Emit metrics. Default true.
        /// </summary>
        public bool EnableMetrics { get; set; } = true;

        /// <summary>
        /// Emit traces. Default true.
        /// </summary>
        public bool EnableTraces { get; set; } = true;

        /// <summary>
        /// Adopt inbound W3C trace context. Default true.
        /// </summary>
        public bool PropagateContext { get; set; } = true;

        #endregion
    }
}
