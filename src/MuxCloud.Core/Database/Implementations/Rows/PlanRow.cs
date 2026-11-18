namespace MuxCloud.Core.Database.Implementations.Rows
{
    using System;
    using System.Data.Common;
    using MuxCloud.Core.Models;

    /// <summary>
    /// Column mapping for the plans table: column list, row mapper, parameters, and portable insert and update statements.
    /// Thread safety: stateless.
    /// </summary>
    public static class PlanRow
    {
        #region Public-Members

        /// <summary>
        /// Table name.
        /// </summary>
        public const string Table = "plans";

        /// <summary>
        /// Comma-separated column list.
        /// </summary>
        public const string Columns = "id, code, name, price_cents, currency, billing_interval, active, is_public, created_utc, last_update_utc";

        /// <summary>
        /// Insert statement.
        /// </summary>
        public const string Insert = "INSERT INTO plans (id, code, name, price_cents, currency, billing_interval, active, is_public, created_utc, last_update_utc) VALUES (@id, @code, @name, @price_cents, @currency, @billing_interval, @active, @is_public, @created_utc, @last_update_utc)";

        /// <summary>
        /// Update-by-identifier statement.
        /// </summary>
        public const string Update = "UPDATE plans SET code = @code, name = @name, price_cents = @price_cents, currency = @currency, billing_interval = @billing_interval, active = @active, is_public = @is_public, created_utc = @created_utc, last_update_utc = @last_update_utc WHERE id = @id";

        #endregion

        #region Public-Methods

        /// <summary>
        /// Map the current row.
        /// </summary>
        /// <param name="reader">Reader positioned on a row.</param>
        /// <returns>Model.</returns>
        public static Plan Map(DbDataReader reader)
        {
            ArgumentNullException.ThrowIfNull(reader);
            return new Plan
            {
                Id = Converters.String(reader, "id"),
                Code = Converters.String(reader, "code"),
                Name = Converters.String(reader, "name"),
                PriceCents = Converters.Long(reader, "price_cents"),
                Currency = Converters.String(reader, "currency"),
                BillingInterval = Converters.String(reader, "billing_interval"),
                Active = Converters.Bool(reader, "active"),
                IsPublic = Converters.Bool(reader, "is_public"),
                CreatedUtc = Converters.Utc(reader, "created_utc"),
                LastUpdateUtc = Converters.Utc(reader, "last_update_utc")
            };
        }

        /// <summary>
        /// Parameters for every column.
        /// </summary>
        /// <param name="item">Model.</param>
        /// <returns>Parameters.</returns>
        public static SqlParameters Parameters(Plan item)
        {
            ArgumentNullException.ThrowIfNull(item);
            return new SqlParameters()
                .Add("id", item.Id)
                .Add("code", item.Code)
                .Add("name", item.Name)
                .Add("price_cents", item.PriceCents)
                .Add("currency", item.Currency)
                .Add("billing_interval", item.BillingInterval)
                .Add("active", item.Active)
                .Add("is_public", item.IsPublic)
                .Add("created_utc", item.CreatedUtc)
                .Add("last_update_utc", item.LastUpdateUtc);
        }

        #endregion
    }
}
