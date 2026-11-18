namespace MuxCloud.Core.Services
{
    using System;

    /// <summary>
    /// A machine's credential stopped being valid; its live tunnel must close.
    /// </summary>
    public class MachineRevokedEventArgs : EventArgs
    {
        #region Public-Members

        /// <summary>
        /// Machine identifier.
        /// </summary>
        public string MachineId { get; }

        /// <summary>
        /// Owning user.
        /// </summary>
        public string UserId { get; }

        /// <summary>
        /// Whether the machine record was deleted (otherwise it was revoked).
        /// </summary>
        public bool Deleted { get; }

        #endregion

        #region Constructors-and-Factories

        /// <summary>
        /// Instantiate.
        /// </summary>
        /// <param name="machineId">Machine identifier.</param>
        /// <param name="userId">Owning user.</param>
        /// <param name="deleted">Whether the record was deleted.</param>
        public MachineRevokedEventArgs(string machineId, string userId, bool deleted)
        {
            MachineId = machineId ?? String.Empty;
            UserId = userId ?? String.Empty;
            Deleted = deleted;
        }

        #endregion
    }
}
