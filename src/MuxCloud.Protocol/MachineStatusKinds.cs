namespace MuxCloud.Protocol
{
    /// <summary>
    /// Values of <see cref="MachineStatusPayload.Kind"/>.
    /// Thread safety: immutable; safe to share.
    /// </summary>
    public static class MachineStatusKinds
    {
        #region Public-Members

        /// <summary>
        /// Periodic or changed status (version, name, counters).
        /// </summary>
        public const string Status = "status";

        /// <summary>
        /// A run is waiting for a tool approval.
        /// </summary>
        public const string ApprovalRequested = "approval_requested";

        /// <summary>
        /// A run finished.
        /// </summary>
        public const string RunCompleted = "run_completed";

        #endregion
    }
}
