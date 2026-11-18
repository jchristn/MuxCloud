namespace MuxCloud.Protocol
{
    using System;
    using System.Text.Json.Serialization;

    /// <summary>
    /// Status pushed by the machine (<see cref="TunnelMessageTypes.MachineStatus"/>) so machine lists and notifications stay
    /// current without polling. Carries no conversation content.
    /// </summary>
    public class MachineStatusPayload
    {
        #region Public-Members

        /// <summary>
        /// What changed (see <see cref="MachineStatusKinds"/>). Default <see cref="MachineStatusKinds.Status"/>.
        /// </summary>
        [JsonPropertyName("kind")]
        public string Kind
        {
            get { return _Kind; }
            set { _Kind = String.IsNullOrWhiteSpace(value) ? MachineStatusKinds.Status : value; }
        }

        /// <summary>
        /// Installed mux version.
        /// </summary>
        [JsonPropertyName("muxVersion")]
        public string MuxVersion
        {
            get { return _MuxVersion; }
            set { _MuxVersion = value ?? String.Empty; }
        }

        /// <summary>
        /// Display name chosen on the machine.
        /// </summary>
        [JsonPropertyName("machineName")]
        public string MachineName
        {
            get { return _MachineName; }
            set { _MachineName = value ?? String.Empty; }
        }

        /// <summary>
        /// Runs in progress on the machine. Minimum 0.
        /// </summary>
        [JsonPropertyName("activeRuns")]
        public int ActiveRuns
        {
            get { return _ActiveRuns; }
            set { _ActiveRuns = Math.Max(0, value); }
        }

        /// <summary>
        /// Runs waiting for a tool approval. Minimum 0.
        /// </summary>
        [JsonPropertyName("awaitingApproval")]
        public int AwaitingApproval
        {
            get { return _AwaitingApproval; }
            set { _AwaitingApproval = Math.Max(0, value); }
        }

        /// <summary>
        /// Whether the machine accepts tool approvals from remote clients (<c>cloud.allowRemoteToolApproval</c>).
        /// </summary>
        [JsonPropertyName("remoteToolApproval")]
        public bool RemoteToolApproval { get; set; } = true;

        /// <summary>
        /// Session the event concerns, for deep links, or empty.
        /// </summary>
        [JsonPropertyName("sessionId")]
        public string SessionId
        {
            get { return _SessionId; }
            set { _SessionId = value ?? String.Empty; }
        }

        /// <summary>
        /// Run the event concerns, or empty.
        /// </summary>
        [JsonPropertyName("runId")]
        public string RunId
        {
            get { return _RunId; }
            set { _RunId = value ?? String.Empty; }
        }

        /// <summary>
        /// Conversation title shown in a notification, or empty. Machines may omit it.
        /// </summary>
        [JsonPropertyName("title")]
        public string Title
        {
            get { return _Title; }
            set { _Title = value ?? String.Empty; }
        }

        #endregion

        #region Private-Members

        private string _Kind = MachineStatusKinds.Status;
        private string _MuxVersion = String.Empty;
        private string _MachineName = String.Empty;
        private int _ActiveRuns = 0;
        private int _AwaitingApproval = 0;
        private string _SessionId = String.Empty;
        private string _RunId = String.Empty;
        private string _Title = String.Empty;

        #endregion
    }
}
