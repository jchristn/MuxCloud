namespace MuxCloud.Core.Settings
{
    using System;

    /// <summary>
    /// Request history capture settings. Relay routes never capture bodies regardless of these values.
    /// </summary>
    public class RequestHistorySettings
    {
        #region Public-Members

        /// <summary>
        /// Capture requests. Default true. When false the routes return empty results.
        /// </summary>
        public bool Enabled { get; set; } = true;

        /// <summary>
        /// Largest captured request body in bytes. Default 65536, minimum 0, maximum 1048576.
        /// </summary>
        public int MaxRequestBodyBytes
        {
            get { return _MaxRequestBodyBytes; }
            set { _MaxRequestBodyBytes = Math.Clamp(value, 0, 1048576); }
        }

        /// <summary>
        /// Largest captured response body in bytes. Default 65536, minimum 0, maximum 1048576.
        /// </summary>
        public int MaxResponseBodyBytes
        {
            get { return _MaxResponseBodyBytes; }
            set { _MaxResponseBodyBytes = Math.Clamp(value, 0, 1048576); }
        }

        /// <summary>
        /// Days to keep entries. Default 30, minimum 1, maximum 3650.
        /// </summary>
        public int RetentionDays
        {
            get { return _RetentionDays; }
            set { _RetentionDays = Math.Clamp(value, 1, 3650); }
        }

        #endregion

        #region Private-Members

        private int _MaxRequestBodyBytes = 65536;
        private int _MaxResponseBodyBytes = 65536;
        private int _RetentionDays = 30;

        #endregion
    }
}
