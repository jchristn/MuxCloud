namespace MuxCloud.Core.Database.Implementations.Rows
{
    using System;
    using System.Data.Common;
    using MuxCloud.Core.Models;

    /// <summary>
    /// Column mapping for the accounts table: column list, row mapper, parameters, and portable insert and update statements.
    /// Thread safety: stateless.
    /// </summary>
    public static class AccountRow
    {
        #region Public-Members

        /// <summary>
        /// Table name.
        /// </summary>
        public const string Table = "accounts";

        /// <summary>
        /// Comma-separated column list.
        /// </summary>
        public const string Columns = "id, name, owner_user_id, active, is_protected, created_utc, last_update_utc";

        /// <summary>
        /// Insert statement.
        /// </summary>
        public const string Insert = "INSERT INTO accounts (id, name, owner_user_id, active, is_protected, created_utc, last_update_utc) VALUES (@id, @name, @owner_user_id, @active, @is_protected, @created_utc, @last_update_utc)";

        /// <summary>
        /// Update-by-identifier statement.
        /// </summary>
        public const string Update = "UPDATE accounts SET name = @name, owner_user_id = @owner_user_id, active = @active, is_protected = @is_protected, created_utc = @created_utc, last_update_utc = @last_update_utc WHERE id = @id";

        #endregion

        #region Public-Methods

        /// <summary>
        /// Map the current row.
        /// </summary>
        /// <param name="reader">Reader positioned on a row.</param>
        /// <returns>Model.</returns>
        public static Account Map(DbDataReader reader)
        {
            ArgumentNullException.ThrowIfNull(reader);
            return new Account
            {
                Id = Converters.String(reader, "id"),
                Name = Converters.String(reader, "name"),
                OwnerUserId = Converters.String(reader, "owner_user_id"),
                Active = Converters.Bool(reader, "active"),
                IsProtected = Converters.Bool(reader, "is_protected"),
                CreatedUtc = Converters.Utc(reader, "created_utc"),
                LastUpdateUtc = Converters.Utc(reader, "last_update_utc")
            };
        }

        /// <summary>
        /// Parameters for every column.
        /// </summary>
        /// <param name="item">Model.</param>
        /// <returns>Parameters.</returns>
        public static SqlParameters Parameters(Account item)
        {
            ArgumentNullException.ThrowIfNull(item);
            return new SqlParameters()
                .Add("id", item.Id)
                .Add("name", item.Name)
                .Add("owner_user_id", item.OwnerUserId)
                .Add("active", item.Active)
                .Add("is_protected", item.IsProtected)
                .Add("created_utc", item.CreatedUtc)
                .Add("last_update_utc", item.LastUpdateUtc);
        }

        #endregion
    }
}
