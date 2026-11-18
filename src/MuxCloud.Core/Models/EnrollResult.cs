namespace MuxCloud.Core.Models
{
    using System;

    /// <summary>
    /// Outcome of a machine enrollment.
    /// </summary>
    public class EnrollResult
    {
        #region Public-Members

        /// <summary>
        /// Machine.
        /// </summary>
        public Machine Machine { get; set; } = new Machine();

        /// <summary>
        /// Machine secret in plain text, shown once.
        /// </summary>
        public string Secret { get; set; } = String.Empty;

        /// <summary>
        /// Whether an existing machine's secret was rotated.
        /// </summary>
        public bool Reenrolled { get; set; } = false;

        #endregion
    }
}
