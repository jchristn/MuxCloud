namespace MuxCloud.Core.Database.Implementations.Rows
{
    using System;
    using System.Data.Common;
    using MuxCloud.Core.Models;

    /// <summary>
    /// Column mapping for the users table: column list, row mapper, parameters, and portable insert and update statements.
    /// Thread safety: stateless.
    /// </summary>
    public static class UserRow
    {
        #region Public-Members

        /// <summary>
        /// Table name.
        /// </summary>
        public const string Table = "users";

        /// <summary>
        /// Comma-separated column list.
        /// </summary>
        public const string Columns = "id, tenant_id, account_id, email, email_normalized, first_name, last_name, password_hash, password_salt, password_algorithm, password_iterations, email_verified_utc, terms_version, terms_accepted_utc, is_admin, is_tenant_admin, active, is_protected, last_login_utc, created_utc, last_update_utc";

        /// <summary>
        /// Insert statement.
        /// </summary>
        public const string Insert = "INSERT INTO users (id, tenant_id, account_id, email, email_normalized, first_name, last_name, password_hash, password_salt, password_algorithm, password_iterations, email_verified_utc, terms_version, terms_accepted_utc, is_admin, is_tenant_admin, active, is_protected, last_login_utc, created_utc, last_update_utc) VALUES (@id, @tenant_id, @account_id, @email, @email_normalized, @first_name, @last_name, @password_hash, @password_salt, @password_algorithm, @password_iterations, @email_verified_utc, @terms_version, @terms_accepted_utc, @is_admin, @is_tenant_admin, @active, @is_protected, @last_login_utc, @created_utc, @last_update_utc)";

        /// <summary>
        /// Update-by-identifier statement.
        /// </summary>
        public const string Update = "UPDATE users SET tenant_id = @tenant_id, account_id = @account_id, email = @email, email_normalized = @email_normalized, first_name = @first_name, last_name = @last_name, password_hash = @password_hash, password_salt = @password_salt, password_algorithm = @password_algorithm, password_iterations = @password_iterations, email_verified_utc = @email_verified_utc, terms_version = @terms_version, terms_accepted_utc = @terms_accepted_utc, is_admin = @is_admin, is_tenant_admin = @is_tenant_admin, active = @active, is_protected = @is_protected, last_login_utc = @last_login_utc, created_utc = @created_utc, last_update_utc = @last_update_utc WHERE id = @id";

        #endregion

        #region Public-Methods

        /// <summary>
        /// Map the current row.
        /// </summary>
        /// <param name="reader">Reader positioned on a row.</param>
        /// <returns>Model.</returns>
        public static User Map(DbDataReader reader)
        {
            ArgumentNullException.ThrowIfNull(reader);
            return new User
            {
                Id = Converters.String(reader, "id"),
                TenantId = Converters.String(reader, "tenant_id"),
                AccountId = Converters.String(reader, "account_id"),
                Email = Converters.String(reader, "email"),
                EmailNormalized = Converters.String(reader, "email_normalized"),
                FirstName = Converters.String(reader, "first_name"),
                LastName = Converters.String(reader, "last_name"),
                PasswordHash = Converters.String(reader, "password_hash"),
                PasswordSalt = Converters.String(reader, "password_salt"),
                PasswordAlgorithm = Converters.String(reader, "password_algorithm"),
                PasswordIterations = Converters.Int(reader, "password_iterations"),
                EmailVerifiedUtc = Converters.NullableUtc(reader, "email_verified_utc"),
                TermsVersion = Converters.String(reader, "terms_version"),
                TermsAcceptedUtc = Converters.NullableUtc(reader, "terms_accepted_utc"),
                IsAdmin = Converters.Bool(reader, "is_admin"),
                IsTenantAdmin = Converters.Bool(reader, "is_tenant_admin"),
                Active = Converters.Bool(reader, "active"),
                IsProtected = Converters.Bool(reader, "is_protected"),
                LastLoginUtc = Converters.NullableUtc(reader, "last_login_utc"),
                CreatedUtc = Converters.Utc(reader, "created_utc"),
                LastUpdateUtc = Converters.Utc(reader, "last_update_utc")
            };
        }

        /// <summary>
        /// Parameters for every column.
        /// </summary>
        /// <param name="item">Model.</param>
        /// <returns>Parameters.</returns>
        public static SqlParameters Parameters(User item)
        {
            ArgumentNullException.ThrowIfNull(item);
            return new SqlParameters()
                .Add("id", item.Id)
                .Add("tenant_id", item.TenantId)
                .Add("account_id", item.AccountId)
                .Add("email", item.Email)
                .Add("email_normalized", item.EmailNormalized)
                .Add("first_name", item.FirstName)
                .Add("last_name", item.LastName)
                .Add("password_hash", item.PasswordHash)
                .Add("password_salt", item.PasswordSalt)
                .Add("password_algorithm", item.PasswordAlgorithm)
                .Add("password_iterations", item.PasswordIterations)
                .Add("email_verified_utc", item.EmailVerifiedUtc)
                .Add("terms_version", item.TermsVersion)
                .Add("terms_accepted_utc", item.TermsAcceptedUtc)
                .Add("is_admin", item.IsAdmin)
                .Add("is_tenant_admin", item.IsTenantAdmin)
                .Add("active", item.Active)
                .Add("is_protected", item.IsProtected)
                .Add("last_login_utc", item.LastLoginUtc)
                .Add("created_utc", item.CreatedUtc)
                .Add("last_update_utc", item.LastUpdateUtc);
        }

        #endregion
    }
}
