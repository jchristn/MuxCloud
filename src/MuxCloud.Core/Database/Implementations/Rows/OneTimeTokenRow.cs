namespace MuxCloud.Core.Database.Implementations.Rows
{
    using System;
    using System.Data.Common;
    using MuxCloud.Core.Enums;
    using MuxCloud.Core.Models;

    /// <summary>
    /// Column mapping for the one_time_tokens table: column list, row mapper, parameters, and portable insert and update statements.
    /// Thread safety: stateless.
    /// </summary>
    public static class OneTimeTokenRow
    {
        #region Public-Members

        /// <summary>
        /// Table name.
        /// </summary>
        public const string Table = "one_time_tokens";

        /// <summary>
        /// Comma-separated column list.
        /// </summary>
        public const string Columns = "id, tenant_id, user_id, purpose, token_hash, expires_utc, used_utc, created_utc";

        /// <summary>
        /// Insert statement.
        /// </summary>
        public const string Insert = "INSERT INTO one_time_tokens (id, tenant_id, user_id, purpose, token_hash, expires_utc, used_utc, created_utc) VALUES (@id, @tenant_id, @user_id, @purpose, @token_hash, @expires_utc, @used_utc, @created_utc)";

        /// <summary>
        /// Update-by-identifier statement.
        /// </summary>
        public const string Update = "UPDATE one_time_tokens SET tenant_id = @tenant_id, user_id = @user_id, purpose = @purpose, token_hash = @token_hash, expires_utc = @expires_utc, used_utc = @used_utc, created_utc = @created_utc WHERE id = @id";

        #endregion

        #region Public-Methods

        /// <summary>
        /// Map the current row.
        /// </summary>
        /// <param name="reader">Reader positioned on a row.</param>
        /// <returns>Model.</returns>
        public static OneTimeToken Map(DbDataReader reader)
        {
            ArgumentNullException.ThrowIfNull(reader);
            return new OneTimeToken
            {
                Id = Converters.String(reader, "id"),
                TenantId = Converters.String(reader, "tenant_id"),
                UserId = Converters.String(reader, "user_id"),
                Purpose = (OneTimeTokenPurposeEnum)Converters.Int(reader, "purpose"),
                TokenHash = Converters.String(reader, "token_hash"),
                ExpiresUtc = Converters.Utc(reader, "expires_utc"),
                UsedUtc = Converters.NullableUtc(reader, "used_utc"),
                CreatedUtc = Converters.Utc(reader, "created_utc")
            };
        }

        /// <summary>
        /// Parameters for every column.
        /// </summary>
        /// <param name="item">Model.</param>
        /// <returns>Parameters.</returns>
        public static SqlParameters Parameters(OneTimeToken item)
        {
            ArgumentNullException.ThrowIfNull(item);
            return new SqlParameters()
                .Add("id", item.Id)
                .Add("tenant_id", item.TenantId)
                .Add("user_id", item.UserId)
                .Add("purpose", item.Purpose)
                .Add("token_hash", item.TokenHash)
                .Add("expires_utc", item.ExpiresUtc)
                .Add("used_utc", item.UsedUtc)
                .Add("created_utc", item.CreatedUtc);
        }

        #endregion
    }
}
