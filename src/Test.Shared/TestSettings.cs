namespace Test.Shared
{
    using System;
    using System.IO;
    using MuxCloud.Core.Database;
    using MuxCloud.Core.Enums;
    using MuxCloud.Core.Settings;

    /// <summary>
    /// Settings tuned for tests: fast password hashing, the File email provider in a temp folder, a fixed signing key.
    /// </summary>
    public static class TestSettings
    {
        #region Public-Members

        /// <summary>
        /// Seed administrator email.
        /// </summary>
        public const string AdminEmail = "admin@muxcloud.test";

        /// <summary>
        /// Seed administrator password.
        /// </summary>
        public const string AdminPassword = "admin-password-123";

        #endregion

        #region Public-Methods

        /// <summary>
        /// Build settings for a database.
        /// </summary>
        /// <param name="database">Database settings.</param>
        /// <returns>Settings.</returns>
        public static MuxCloudSettings Create(DatabaseSettings database)
        {
            MuxCloudSettings settings = new MuxCloudSettings();
            settings.Database = database;
            settings.Auth.SigningKey = "test-signing-key-0123456789abcdef0123456789abcdef";
            settings.Auth.PasswordIterations = 1000;
            settings.Auth.AnonymousRequestsPerHour = 1000;
            settings.Admin.Email = AdminEmail;
            settings.Admin.Password = AdminPassword;
            settings.Email.Provider = EmailProviderEnum.File;
            settings.Email.File.Directory = Path.Combine(Path.GetTempPath(), "muxcloud-mail-" + Guid.NewGuid().ToString("N").Substring(0, 8));
            settings.Logging.ConsoleLogging = false;
            settings.Rest.Hostname = "127.0.0.1";
            return settings;
        }

        #endregion
    }
}
