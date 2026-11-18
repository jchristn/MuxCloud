namespace MuxCloud.Core.Database.Implementations.Rows
{
    using System;
    using System.Data.Common;
    using MuxCloud.Core.Models;

    /// <summary>
    /// Column mapping for the entitlement_overrides table: column list, row mapper, parameters, and portable insert and update statements.
    /// Thread safety: stateless.
    /// </summary>
    public static class EntitlementOverrideRow
    {
        #region Public-Members

        /// <summary>
        /// Table name.
        /// </summary>
        public const string Table = "entitlement_overrides";

        /// <summary>
        /// Comma-separated column list.
        /// </summary>
        public const string Columns = "id, account_id, feature_key, limit_value, reason, expires_utc, created_utc";

        /// <summary>
        /// Insert statement.
        /// </summary>
        public const string Insert = "INSERT INTO entitlement_overrides (id, account_id, feature_key, limit_value, reason, expires_utc, created_utc) VALUES (@id, @account_id, @feature_key, @limit_value, @reason, @expires_utc, @created_utc)";

        /// <summary>
        /// Update-by-identifier statement.
        /// </summary>
        public const string Update = "UPDATE entitlement_overrides SET account_id = @account_id, feature_key = @feature_key, limit_value = @limit_value, reason = @reason, expires_utc = @expires_utc, created_utc = @created_utc WHERE id = @id";

        #endregion

        #region Public-Methods

        /// <summary>
        /// Map the current row.
        /// </summary>
        /// <param name="reader">Reader positioned on a row.</param>
        /// <returns>Model.</returns>
        public static EntitlementOverride Map(DbDataReader reader)
        {
            ArgumentNullException.ThrowIfNull(reader);
            return new EntitlementOverride
            {
                Id = Converters.String(reader, "id"),
                AccountId = Converters.String(reader, "account_id"),
                FeatureKey = Converters.String(reader, "feature_key"),
                LimitValue = Converters.NullableLong(reader, "limit_value"),
                Reason = Converters.String(reader, "reason"),
                ExpiresUtc = Converters.NullableUtc(reader, "expires_utc"),
                CreatedUtc = Converters.Utc(reader, "created_utc")
            };
        }

        /// <summary>
        /// Parameters for every column.
        /// </summary>
        /// <param name="item">Model.</param>
        /// <returns>Parameters.</returns>
        public static SqlParameters Parameters(EntitlementOverride item)
        {
            ArgumentNullException.ThrowIfNull(item);
            return new SqlParameters()
                .Add("id", item.Id)
                .Add("account_id", item.AccountId)
                .Add("feature_key", item.FeatureKey)
                .Add("limit_value", item.LimitValue)
                .Add("reason", item.Reason)
                .Add("expires_utc", item.ExpiresUtc)
                .Add("created_utc", item.CreatedUtc);
        }

        #endregion
    }
}
