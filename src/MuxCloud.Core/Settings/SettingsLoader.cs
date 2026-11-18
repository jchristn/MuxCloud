namespace MuxCloud.Core.Settings
{
    using System;
    using System.Collections;
    using System.IO;
    using System.Security.Cryptography;
    using System.Text.Json;
    using System.Text.Json.Serialization;
    using MuxCloud.Core.Database;
    using MuxCloud.Core.Enums;

    /// <summary>
    /// Loads settings from a JSON file and applies MUXCLOUD_* environment overrides. A missing file is created with
    /// defaults and a generated signing key. Environment values are applied after the file is written, so injected
    /// secrets are never persisted.
    /// Thread safety: stateless; safe to call concurrently on different files.
    /// </summary>
    public static class SettingsLoader
    {
        #region Public-Members

        /// <summary>
        /// Default settings file name.
        /// </summary>
        public const string DefaultFilename = "muxcloud.json";

        /// <summary>
        /// Serializer options for the settings file (PascalCase names, enums as strings, indented).
        /// </summary>
        public static readonly JsonSerializerOptions JsonOptions = new JsonSerializerOptions
        {
            WriteIndented = true,
            PropertyNameCaseInsensitive = true,
            Converters = { new JsonStringEnumConverter() }
        };

        #endregion

        #region Public-Methods

        /// <summary>
        /// Resolve the settings path: the argument, else MUXCLOUD_SETTINGS_FILE, else muxcloud.json in the working directory.
        /// </summary>
        /// <param name="path">Explicit path, or null.</param>
        /// <returns>Path.</returns>
        public static string ResolvePath(string? path)
        {
            if (!String.IsNullOrWhiteSpace(path)) return path;
            string? env = Environment.GetEnvironmentVariable("MUXCLOUD_SETTINGS_FILE");
            return String.IsNullOrWhiteSpace(env) ? DefaultFilename : env;
        }

        /// <summary>
        /// Load settings from a file, creating it with defaults when missing, then apply environment overrides.
        /// </summary>
        /// <param name="path">Settings file path.</param>
        /// <returns>Settings.</returns>
        /// <exception cref="ArgumentException">path is blank.</exception>
        /// <exception cref="InvalidDataException">The file is not valid settings JSON.</exception>
        public static MuxCloudSettings Load(string path)
        {
            if (String.IsNullOrWhiteSpace(path)) throw new ArgumentException("A settings file path is required.", nameof(path));
            MuxCloudSettings settings;
            bool write = false;
            if (File.Exists(path))
            {
                try
                {
                    settings = JsonSerializer.Deserialize<MuxCloudSettings>(File.ReadAllText(path), JsonOptions) ?? new MuxCloudSettings();
                }
                catch (JsonException e)
                {
                    throw new InvalidDataException("Settings file '" + path + "' is not valid JSON: " + e.Message, e);
                }
            }
            else
            {
                settings = new MuxCloudSettings();
                write = true;
            }

            if (String.IsNullOrWhiteSpace(settings.Auth.SigningKey) && String.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("MUXCLOUD_AUTH_SIGNING_KEY")))
            {
                settings.Auth.SigningKey = GenerateSigningKey();
                write = true;
            }

            if (write) Save(settings, path);
            ApplyEnvironment(settings, Environment.GetEnvironmentVariables());
            return settings;
        }

        /// <summary>
        /// Write settings to a file.
        /// </summary>
        /// <param name="settings">Settings.</param>
        /// <param name="path">Path.</param>
        /// <exception cref="ArgumentNullException">settings is null.</exception>
        public static void Save(MuxCloudSettings settings, string path)
        {
            ArgumentNullException.ThrowIfNull(settings);
            string? directory = Path.GetDirectoryName(Path.GetFullPath(path));
            if (!String.IsNullOrEmpty(directory)) Directory.CreateDirectory(directory);
            File.WriteAllText(path, JsonSerializer.Serialize(settings, JsonOptions));
        }

        /// <summary>
        /// Apply environment overrides. Recognized variables: MUXCLOUD_PUBLIC_URL, MUXCLOUD_NODE_ID, MUXCLOUD_DASHBOARD_DIR,
        /// MUXCLOUD_REST_HOST, MUXCLOUD_REST_PORT, MUXCLOUD_DB_TYPE, MUXCLOUD_DB_FILENAME, MUXCLOUD_DB_SERVER, MUXCLOUD_DB_PORT,
        /// MUXCLOUD_DB_DATABASE, MUXCLOUD_DB_USERNAME, MUXCLOUD_DB_PASSWORD, MUXCLOUD_DB_CONNECTION_STRING,
        /// MUXCLOUD_AUTH_SIGNING_KEY, MUXCLOUD_ADMIN_EMAIL, MUXCLOUD_ADMIN_PASSWORD, MUXCLOUD_EMAIL_PROVIDER,
        /// MUXCLOUD_MAILGUN_API_KEY, MUXCLOUD_MAILGUN_DOMAIN.
        /// </summary>
        /// <param name="settings">Settings to modify.</param>
        /// <param name="environment">Environment variables.</param>
        /// <exception cref="ArgumentNullException">An argument is null.</exception>
        /// <exception cref="InvalidDataException">A value cannot be parsed.</exception>
        public static void ApplyEnvironment(MuxCloudSettings settings, IDictionary environment)
        {
            ArgumentNullException.ThrowIfNull(settings);
            ArgumentNullException.ThrowIfNull(environment);
            string? v;
            if ((v = Get(environment, "MUXCLOUD_PUBLIC_URL")) != null) { settings.Server.PublicUrl = v; settings.EnvironmentOverrides.Add("Server.PublicUrl"); }
            if ((v = Get(environment, "MUXCLOUD_NODE_ID")) != null) { settings.Server.NodeId = v; settings.EnvironmentOverrides.Add("Server.NodeId"); }
            if ((v = Get(environment, "MUXCLOUD_DASHBOARD_DIR")) != null) { settings.Server.DashboardDirectory = v; settings.EnvironmentOverrides.Add("Server.DashboardDirectory"); }
            if ((v = Get(environment, "MUXCLOUD_REST_HOST")) != null) { settings.Rest.Hostname = v; settings.EnvironmentOverrides.Add("Rest.Hostname"); }
            if ((v = Get(environment, "MUXCLOUD_REST_PORT")) != null) { settings.Rest.Port = ParseInt(v, "MUXCLOUD_REST_PORT"); settings.EnvironmentOverrides.Add("Rest.Port"); }
            if ((v = Get(environment, "MUXCLOUD_DB_TYPE")) != null)
            {
                if (!Enum.TryParse(v, true, out DatabaseTypeEnum type)) throw new InvalidDataException("MUXCLOUD_DB_TYPE '" + v + "' is not one of Sqlite, Mysql, Postgresql, SqlServer.");
                settings.Database.Type = type;
                settings.EnvironmentOverrides.Add("Database.Type");
            }

            if ((v = Get(environment, "MUXCLOUD_DB_FILENAME")) != null) { settings.Database.Filename = v; settings.EnvironmentOverrides.Add("Database.Filename"); }
            if ((v = Get(environment, "MUXCLOUD_DB_SERVER")) != null) { settings.Database.Server = v; settings.EnvironmentOverrides.Add("Database.Server"); }
            if ((v = Get(environment, "MUXCLOUD_DB_PORT")) != null) { settings.Database.Port = ParseInt(v, "MUXCLOUD_DB_PORT"); settings.EnvironmentOverrides.Add("Database.Port"); }
            if ((v = Get(environment, "MUXCLOUD_DB_DATABASE")) != null) { settings.Database.DatabaseName = v; settings.EnvironmentOverrides.Add("Database.DatabaseName"); }
            if ((v = Get(environment, "MUXCLOUD_DB_USERNAME")) != null) { settings.Database.Username = v; settings.EnvironmentOverrides.Add("Database.Username"); }
            if ((v = Get(environment, "MUXCLOUD_DB_PASSWORD")) != null) { settings.Database.Password = v; settings.EnvironmentOverrides.Add("Database.Password"); }
            if ((v = Get(environment, "MUXCLOUD_DB_CONNECTION_STRING")) != null) { settings.Database.ConnectionString = v; settings.EnvironmentOverrides.Add("Database.ConnectionString"); }
            if ((v = Get(environment, "MUXCLOUD_AUTH_SIGNING_KEY")) != null) { settings.Auth.SigningKey = v; settings.EnvironmentOverrides.Add("Auth.SigningKey"); }
            if ((v = Get(environment, "MUXCLOUD_ADMIN_EMAIL")) != null) { settings.Admin.Email = v; settings.EnvironmentOverrides.Add("Admin.Email"); }
            if ((v = Get(environment, "MUXCLOUD_ADMIN_PASSWORD")) != null) { settings.Admin.Password = v; settings.EnvironmentOverrides.Add("Admin.Password"); }
            if ((v = Get(environment, "MUXCLOUD_EMAIL_PROVIDER")) != null)
            {
                if (!Enum.TryParse(v, true, out EmailProviderEnum provider)) throw new InvalidDataException("MUXCLOUD_EMAIL_PROVIDER '" + v + "' is not one of Disabled, File, Mailgun.");
                settings.Email.Provider = provider;
                settings.EnvironmentOverrides.Add("Email.Provider");
            }

            if ((v = Get(environment, "MUXCLOUD_MAILGUN_API_KEY")) != null) { settings.Email.Mailgun.ApiKey = v; settings.EnvironmentOverrides.Add("Email.Mailgun.ApiKey"); }
            if ((v = Get(environment, "MUXCLOUD_MAILGUN_DOMAIN")) != null) { settings.Email.Mailgun.Domain = v; settings.EnvironmentOverrides.Add("Email.Mailgun.Domain"); }
        }

        /// <summary>
        /// Generate a random signing key (64 hex characters, 256 bits).
        /// </summary>
        /// <returns>Key.</returns>
        public static string GenerateSigningKey()
        {
            return Convert.ToHexString(RandomNumberGenerator.GetBytes(32)).ToLowerInvariant();
        }

        #endregion

        #region Private-Methods

        private static string? Get(IDictionary environment, string name)
        {
            object? value = environment.Contains(name) ? environment[name] : null;
            string? text = value as string;
            return String.IsNullOrWhiteSpace(text) ? null : text;
        }

        private static int ParseInt(string value, string name)
        {
            if (!Int32.TryParse(value, out int parsed)) throw new InvalidDataException(name + " '" + value + "' is not an integer.");
            return parsed;
        }

        #endregion
    }
}
