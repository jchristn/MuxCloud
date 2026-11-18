namespace MuxCloud.Core.Database.Implementations.Rows
{
    using System;
    using System.Data.Common;
    using MuxCloud.Core.Enums;
    using MuxCloud.Core.Models;

    /// <summary>
    /// Column mapping for the subscriptions table: column list, row mapper, parameters, and portable insert and update statements.
    /// Thread safety: stateless.
    /// </summary>
    public static class SubscriptionRow
    {
        #region Public-Members

        /// <summary>
        /// Table name.
        /// </summary>
        public const string Table = "subscriptions";

        /// <summary>
        /// Comma-separated column list.
        /// </summary>
        public const string Columns = "id, account_id, tenant_id, plan_id, status, provider, provider_customer_id, provider_subscription_id, current_period_end_utc, cancel_at_period_end, created_utc, last_update_utc";

        /// <summary>
        /// Insert statement.
        /// </summary>
        public const string Insert = "INSERT INTO subscriptions (id, account_id, tenant_id, plan_id, status, provider, provider_customer_id, provider_subscription_id, current_period_end_utc, cancel_at_period_end, created_utc, last_update_utc) VALUES (@id, @account_id, @tenant_id, @plan_id, @status, @provider, @provider_customer_id, @provider_subscription_id, @current_period_end_utc, @cancel_at_period_end, @created_utc, @last_update_utc)";

        /// <summary>
        /// Update-by-identifier statement.
        /// </summary>
        public const string Update = "UPDATE subscriptions SET account_id = @account_id, tenant_id = @tenant_id, plan_id = @plan_id, status = @status, provider = @provider, provider_customer_id = @provider_customer_id, provider_subscription_id = @provider_subscription_id, current_period_end_utc = @current_period_end_utc, cancel_at_period_end = @cancel_at_period_end, created_utc = @created_utc, last_update_utc = @last_update_utc WHERE id = @id";

        #endregion

        #region Public-Methods

        /// <summary>
        /// Map the current row.
        /// </summary>
        /// <param name="reader">Reader positioned on a row.</param>
        /// <returns>Model.</returns>
        public static Subscription Map(DbDataReader reader)
        {
            ArgumentNullException.ThrowIfNull(reader);
            return new Subscription
            {
                Id = Converters.String(reader, "id"),
                AccountId = Converters.String(reader, "account_id"),
                TenantId = Converters.String(reader, "tenant_id"),
                PlanId = Converters.String(reader, "plan_id"),
                Status = (SubscriptionStatusEnum)Converters.Int(reader, "status"),
                Provider = Converters.String(reader, "provider"),
                ProviderCustomerId = Converters.String(reader, "provider_customer_id"),
                ProviderSubscriptionId = Converters.String(reader, "provider_subscription_id"),
                CurrentPeriodEndUtc = Converters.NullableUtc(reader, "current_period_end_utc"),
                CancelAtPeriodEnd = Converters.Bool(reader, "cancel_at_period_end"),
                CreatedUtc = Converters.Utc(reader, "created_utc"),
                LastUpdateUtc = Converters.Utc(reader, "last_update_utc")
            };
        }

        /// <summary>
        /// Parameters for every column.
        /// </summary>
        /// <param name="item">Model.</param>
        /// <returns>Parameters.</returns>
        public static SqlParameters Parameters(Subscription item)
        {
            ArgumentNullException.ThrowIfNull(item);
            return new SqlParameters()
                .Add("id", item.Id)
                .Add("account_id", item.AccountId)
                .Add("tenant_id", item.TenantId)
                .Add("plan_id", item.PlanId)
                .Add("status", item.Status)
                .Add("provider", item.Provider)
                .Add("provider_customer_id", item.ProviderCustomerId)
                .Add("provider_subscription_id", item.ProviderSubscriptionId)
                .Add("current_period_end_utc", item.CurrentPeriodEndUtc)
                .Add("cancel_at_period_end", item.CancelAtPeriodEnd)
                .Add("created_utc", item.CreatedUtc)
                .Add("last_update_utc", item.LastUpdateUtc);
        }

        #endregion
    }
}
