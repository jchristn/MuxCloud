namespace MuxCloud.Core.Models
{
    using System;
    using System.Collections.Generic;
    using System.Text.Json.Serialization;

    /// <summary>
    /// One page of results.
    /// </summary>
    /// <typeparam name="T">Item type.</typeparam>
    public class PagedResult<T>
    {
        #region Public-Members

        /// <summary>
        /// Items on this page.
        /// </summary>
        [JsonPropertyName("items")]
        public List<T> Items
        {
            get { return _Items; }
            set { _Items = value ?? new List<T>(); }
        }

        /// <summary>
        /// 1-based page number.
        /// </summary>
        [JsonPropertyName("pageNumber")]
        public int PageNumber { get; set; } = 1;

        /// <summary>
        /// Page size.
        /// </summary>
        [JsonPropertyName("pageSize")]
        public int PageSize { get; set; } = 25;

        /// <summary>
        /// Total matching items.
        /// </summary>
        [JsonPropertyName("totalCount")]
        public long TotalCount { get; set; } = 0;

        #endregion

        #region Private-Members

        private List<T> _Items = new List<T>();

        #endregion

        #region Public-Methods

        /// <summary>
        /// Project the items into another type, keeping the paging values.
        /// </summary>
        /// <typeparam name="TOut">Output item type.</typeparam>
        /// <param name="map">Projection.</param>
        /// <returns>Projected page.</returns>
        /// <exception cref="ArgumentNullException">map is null.</exception>
        public PagedResult<TOut> Map<TOut>(Func<T, TOut> map)
        {
            ArgumentNullException.ThrowIfNull(map);
            List<TOut> items = new List<TOut>();
            foreach (T item in Items) items.Add(map(item));
            return new PagedResult<TOut> { Items = items, PageNumber = PageNumber, PageSize = PageSize, TotalCount = TotalCount };
        }

        #endregion
    }
}
