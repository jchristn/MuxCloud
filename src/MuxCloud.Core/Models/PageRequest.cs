namespace MuxCloud.Core.Models
{
    using System;

    /// <summary>
    /// Paging input.
    /// </summary>
    public class PageRequest
    {
        #region Public-Members

        /// <summary>
        /// 1-based page number. Default 1, minimum 1.
        /// </summary>
        public int PageNumber
        {
            get { return _PageNumber; }
            set { _PageNumber = Math.Max(1, value); }
        }

        /// <summary>
        /// Page size. Default 25, minimum 1, maximum 1000.
        /// </summary>
        public int PageSize
        {
            get { return _PageSize; }
            set { _PageSize = Math.Clamp(value, 1, 1000); }
        }

        /// <summary>
        /// Rows to skip.
        /// </summary>
        public int Offset
        {
            get { return (PageNumber - 1) * PageSize; }
        }

        #endregion

        #region Private-Members

        private int _PageNumber = 1;
        private int _PageSize = 25;

        #endregion
    }
}
