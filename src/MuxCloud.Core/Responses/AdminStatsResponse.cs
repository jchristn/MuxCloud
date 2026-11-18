namespace MuxCloud.Core.Responses
{
    using System;
    using System.Text.Json.Serialization;

    /// <summary>
    /// Response of GET /v1.0/api/admin/stats.
    /// </summary>
    public class AdminStatsResponse
    {
        #region Public-Members

        /// <summary>
        /// Users.
        /// </summary>
        [JsonPropertyName("users")]
        public long Users { get; set; } = 0;

        /// <summary>
        /// Machines.
        /// </summary>
        [JsonPropertyName("machines")]
        public long Machines { get; set; } = 0;

        /// <summary>
        /// Online machines.
        /// </summary>
        [JsonPropertyName("onlineMachines")]
        public long OnlineMachines { get; set; } = 0;

        /// <summary>
        /// Live tunnels.
        /// </summary>
        [JsonPropertyName("liveConnections")]
        public long LiveConnections { get; set; } = 0;

        /// <summary>
        /// Open relay streams and channels.
        /// </summary>
        [JsonPropertyName("relayStreams")]
        public long RelayStreams { get; set; } = 0;

        /// <summary>
        /// Connected event sockets.
        /// </summary>
        [JsonPropertyName("eventSubscribers")]
        public long EventSubscribers { get; set; } = 0;

        #endregion
    }
}
