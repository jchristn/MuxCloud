namespace MuxCloud.Core.Database.Implementations
{
    using System;
    using System.Collections.Generic;
    using System.Data.Common;
    using System.Threading;
    using System.Threading.Tasks;
    using MuxCloud.Core.Models;

    /// <summary>
    /// Runs a count query and a paged select.
    /// Thread safety: stateless.
    /// </summary>
    public static class Paging
    {
        #region Public-Methods

        /// <summary>
        /// Count and fetch one page.
        /// </summary>
        /// <typeparam name="T">Row type.</typeparam>
        /// <param name="db">Executor.</param>
        /// <param name="from">FROM and WHERE part, for example "users WHERE ...".</param>
        /// <param name="columns">Selected columns.</param>
        /// <param name="orderBy">ORDER BY expression without the keywords.</param>
        /// <param name="parameters">Filter parameters.</param>
        /// <param name="page">Paging.</param>
        /// <param name="map">Row mapper.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Page.</returns>
        /// <exception cref="ArgumentNullException">A required argument is null.</exception>
        public static async Task<PagedResult<T>> QueryAsync<T>(DatabaseExecutor db, string from, string columns, string orderBy, SqlParameters parameters, PageRequest page, Func<DbDataReader, T> map, CancellationToken token)
        {
            ArgumentNullException.ThrowIfNull(db);
            ArgumentNullException.ThrowIfNull(parameters);
            ArgumentNullException.ThrowIfNull(page);
            ArgumentNullException.ThrowIfNull(map);
            long total = await db.ScalarAsync("SELECT COUNT(*) FROM " + from, parameters, token).ConfigureAwait(false);
            SqlParameters withPage = new SqlParameters();
            foreach (KeyValuePair<string, object?> pair in parameters.Values) withPage.Add(pair.Key, pair.Value);
            withPage.Add("offset", page.Offset).Add("limit", page.PageSize);
            List<T> items = await db.QueryAsync(db.Dialect.Page("SELECT " + columns + " FROM " + from + " ORDER BY " + orderBy), withPage, map, token).ConfigureAwait(false);
            return new PagedResult<T> { Items = items, PageNumber = page.PageNumber, PageSize = page.PageSize, TotalCount = total };
        }

        #endregion
    }
}
