namespace MuxCloud.Core.Database.Implementations
{
    using System;
    using System.Collections.Generic;
    using System.Threading;
    using System.Threading.Tasks;
    using MuxCloud.Core.Database.Implementations.Rows;
    using MuxCloud.Core.Database.Interfaces;
    using MuxCloud.Core.Models;

    /// <summary>
    /// Tenant data access. Portable SQL; engine differences live in the dialect.
    /// Thread safety: safe to call concurrently.
    /// </summary>
    public class TenantMethods : ITenantMethods
    {
        #region Private-Members

        private readonly DatabaseExecutor _Db;

        #endregion

        #region Constructors-and-Factories

        /// <summary>
        /// Instantiate.
        /// </summary>
        /// <param name="db">Executor.</param>
        /// <exception cref="ArgumentNullException">db is null.</exception>
        public TenantMethods(DatabaseExecutor db)
        {
            ArgumentNullException.ThrowIfNull(db);
            _Db = db;
        }

        #endregion

        #region Public-Methods

        /// <inheritdoc />
        public async Task<Tenant> CreateAsync(Tenant tenant, CancellationToken token = default)
        {
            ArgumentNullException.ThrowIfNull(tenant);
            await _Db.ExecuteAsync(TenantRow.Insert, TenantRow.Parameters(tenant), token).ConfigureAwait(false);
            return tenant;
        }

        /// <inheritdoc />
        public Task<Tenant?> ReadAsync(string id, CancellationToken token = default)
        {
            return _Db.QueryFirstAsync("SELECT " + TenantRow.Columns + " FROM tenants WHERE id = @id", new SqlParameters().Add("id", id), TenantRow.Map, token);
        }

        /// <inheritdoc />
        public Task<Tenant?> ReadProtectedAsync(CancellationToken token = default)
        {
            return _Db.QueryFirstAsync("SELECT " + TenantRow.Columns + " FROM tenants WHERE is_protected = @p ORDER BY created_utc", new SqlParameters().Add("p", true), TenantRow.Map, token);
        }

        /// <inheritdoc />
        public async Task<Tenant> UpdateAsync(Tenant tenant, CancellationToken token = default)
        {
            ArgumentNullException.ThrowIfNull(tenant);
            tenant.LastUpdateUtc = DateTime.UtcNow;
            await _Db.ExecuteAsync(TenantRow.Update, TenantRow.Parameters(tenant), token).ConfigureAwait(false);
            return tenant;
        }

        /// <inheritdoc />
        public async Task DeleteAsync(string id, CancellationToken token = default)
        {
            await _Db.ExecuteAsync("DELETE FROM tenants WHERE id = @id", new SqlParameters().Add("id", id), token).ConfigureAwait(false);
        }

        #endregion
    }
}
