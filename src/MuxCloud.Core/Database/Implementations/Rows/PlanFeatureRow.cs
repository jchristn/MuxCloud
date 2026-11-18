namespace MuxCloud.Core.Database.Implementations.Rows
{
    using System;
    using System.Data.Common;
    using MuxCloud.Core.Models;

    /// <summary>
    /// Column mapping for the plan_features table: column list, row mapper, parameters, and portable insert and update statements.
    /// Thread safety: stateless.
    /// </summary>
    public static class PlanFeatureRow
    {
        #region Public-Members

        /// <summary>
        /// Table name.
        /// </summary>
        public const string Table = "plan_features";

        /// <summary>
        /// Comma-separated column list.
        /// </summary>
        public const string Columns = "id, plan_id, feature_key, limit_value";

        /// <summary>
        /// Insert statement.
        /// </summary>
        public const string Insert = "INSERT INTO plan_features (id, plan_id, feature_key, limit_value) VALUES (@id, @plan_id, @feature_key, @limit_value)";

        /// <summary>
        /// Update-by-identifier statement.
        /// </summary>
        public const string Update = "UPDATE plan_features SET plan_id = @plan_id, feature_key = @feature_key, limit_value = @limit_value WHERE id = @id";

        #endregion

        #region Public-Methods

        /// <summary>
        /// Map the current row.
        /// </summary>
        /// <param name="reader">Reader positioned on a row.</param>
        /// <returns>Model.</returns>
        public static PlanFeature Map(DbDataReader reader)
        {
            ArgumentNullException.ThrowIfNull(reader);
            return new PlanFeature
            {
                Id = Converters.String(reader, "id"),
                PlanId = Converters.String(reader, "plan_id"),
                FeatureKey = Converters.String(reader, "feature_key"),
                LimitValue = Converters.NullableLong(reader, "limit_value")
            };
        }

        /// <summary>
        /// Parameters for every column.
        /// </summary>
        /// <param name="item">Model.</param>
        /// <returns>Parameters.</returns>
        public static SqlParameters Parameters(PlanFeature item)
        {
            ArgumentNullException.ThrowIfNull(item);
            return new SqlParameters()
                .Add("id", item.Id)
                .Add("plan_id", item.PlanId)
                .Add("feature_key", item.FeatureKey)
                .Add("limit_value", item.LimitValue);
        }

        #endregion
    }
}
