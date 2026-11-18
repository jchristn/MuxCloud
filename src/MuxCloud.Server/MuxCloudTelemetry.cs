namespace MuxCloud.Server
{
    using System;
    using System.Collections.Generic;
    using System.Diagnostics;
    using System.Diagnostics.Metrics;

    /// <summary>
    /// The MuxCloud meter and activity source. Labels are low-cardinality (never identifiers). Collect them by subscribing to
    /// "MuxCloud" alongside Watson's "Watson" meter and activity source.
    /// Thread safety: safe to call concurrently.
    /// </summary>
    public static class MuxCloudTelemetry
    {
        #region Public-Members

        /// <summary>
        /// Meter and activity source name.
        /// </summary>
        public const string Name = "MuxCloud";

        /// <summary>
        /// Activity source.
        /// </summary>
        public static readonly ActivitySource Source = new ActivitySource(Name, MuxCloud.Core.Constants.Version);

        /// <summary>
        /// Meter.
        /// </summary>
        public static readonly Meter Meter = new Meter(Name, MuxCloud.Core.Constants.Version);

        #endregion

        #region Private-Members

        private static readonly Counter<long> _Handshakes = Meter.CreateCounter<long>("muxcloud_tunnel_handshakes_total", description: "Tunnel handshakes by result.");
        private static readonly Counter<long> _Relays = Meter.CreateCounter<long>("muxcloud_relay_requests_total", description: "Relayed HTTP requests by status class.");
        private static readonly Histogram<double> _RelayDuration = Meter.CreateHistogram<double>("muxcloud_relay_duration_ms", "ms", "Relayed HTTP request duration.");
        private static Func<int>? _OnlineMachines = null;
        private static Func<int>? _EventSubscribers = null;

        #endregion

        #region Public-Methods

        /// <summary>
        /// Register gauges.
        /// </summary>
        /// <param name="onlineMachines">Live tunnel count.</param>
        /// <param name="eventSubscribers">Events socket count.</param>
        public static void RegisterGauges(Func<int> onlineMachines, Func<int> eventSubscribers)
        {
            bool first = _OnlineMachines == null;
            _OnlineMachines = onlineMachines;
            _EventSubscribers = eventSubscribers;
            if (!first) return;
            Meter.CreateObservableGauge("muxcloud_tunnels_online", () => _OnlineMachines?.Invoke() ?? 0, description: "Machines with a live tunnel.");
            Meter.CreateObservableGauge("muxcloud_event_subscribers", () => _EventSubscribers?.Invoke() ?? 0, description: "Connected account event sockets.");
        }

        /// <summary>
        /// Count a handshake (best effort).
        /// </summary>
        /// <param name="result">success, bad_handshake, unauthorized, revoked, unsupported_version.</param>
        public static void Handshake(string result)
        {
            try
            {
                _Handshakes.Add(1, new KeyValuePair<string, object?>("result", result));
            }
            catch (Exception)
            {
            }
        }

        /// <summary>
        /// Record a relayed request (best effort).
        /// </summary>
        /// <param name="status">Status code.</param>
        /// <param name="durationMs">Duration.</param>
        public static void Relay(int status, double durationMs)
        {
            try
            {
                KeyValuePair<string, object?> tag = new KeyValuePair<string, object?>("status_class", (status / 100) + "xx");
                _Relays.Add(1, tag);
                _RelayDuration.Record(durationMs, tag);
            }
            catch (Exception)
            {
            }
        }

        #endregion
    }
}
