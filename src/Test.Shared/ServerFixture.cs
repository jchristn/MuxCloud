namespace Test.Shared
{
    using System;
    using System.IO;
    using System.Linq;
    using System.Net;
    using System.Net.Http;
    using System.Net.Http.Headers;
    using System.Net.Sockets;
    using System.Text;
    using System.Text.Json;
    using System.Threading;
    using System.Threading.Tasks;
    using MuxCloud.Core.Requests;
    using MuxCloud.Core.Responses;
    using MuxCloud.Core.Settings;
    using MuxCloud.Server;
    using MuxCloud.Server.Http;

    /// <summary>
    /// A real MuxCloudServer on a free loopback port with a fresh database and the File email provider.
    /// </summary>
    public sealed class ServerFixture : IAsyncDisposable
    {
        #region Public-Members

        /// <summary>
        /// Server.
        /// </summary>
        public MuxCloudServer Server { get; }

        /// <summary>
        /// Settings.
        /// </summary>
        public MuxCloudSettings Settings { get; }

        /// <summary>
        /// Base URL, http://127.0.0.1:port.
        /// </summary>
        public string BaseUrl { get; }

        #endregion

        #region Constructors-and-Factories

        private ServerFixture(MuxCloudServer server, MuxCloudSettings settings)
        {
            Server = server;
            Settings = settings;
            BaseUrl = "http://127.0.0.1:" + settings.Rest.Port;
        }

        /// <summary>
        /// Start a server.
        /// </summary>
        /// <param name="token">Cancellation token.</param>
        /// <param name="configure">Optional settings changes.</param>
        /// <returns>Fixture.</returns>
        public static async Task<ServerFixture> StartAsync(CancellationToken token, Action<MuxCloudSettings>? configure = null)
        {
            MuxCloudSettings settings = TestSettings.Create(await TestDatabase.CreateAsync(token).ConfigureAwait(false));
            settings.Rest.Port = FreePort();
            settings.Server.PublicUrl = "http://127.0.0.1:" + settings.Rest.Port;
            settings.Server.DashboardDirectory = Path.Combine(Path.GetTempPath(), "muxcloud-no-dashboard-" + Guid.NewGuid().ToString("N"));
            configure?.Invoke(settings);
            MuxCloudServer server = new MuxCloudServer(settings);
            await server.StartAsync(token).ConfigureAwait(false);
            return new ServerFixture(server, settings);
        }

        #endregion

        #region Public-Methods

        /// <summary>
        /// A client with a cookie jar that sends Origin for the public URL (like a browser on the dashboard).
        /// </summary>
        /// <returns>Client.</returns>
        public HttpClient BrowserClient()
        {
            HttpClientHandler handler = new HttpClientHandler { CookieContainer = new CookieContainer(), UseCookies = true };
            HttpClient client = new HttpClient(handler) { BaseAddress = new Uri(BaseUrl) };
            client.DefaultRequestHeaders.Add("Origin", BaseUrl);
            return client;
        }

        /// <summary>
        /// A client without cookies (like the mobile app).
        /// </summary>
        /// <param name="accessToken">Bearer token, or null.</param>
        /// <returns>Client.</returns>
        public HttpClient BearerClient(string? accessToken)
        {
            HttpClient client = new HttpClient(new HttpClientHandler { UseCookies = false }) { BaseAddress = new Uri(BaseUrl) };
            if (accessToken != null) client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
            return client;
        }

        /// <summary>
        /// Sign in as a mobile client.
        /// </summary>
        /// <param name="email">Email.</param>
        /// <param name="password">Password.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Login response with tokens.</returns>
        public async Task<LoginResponse> MobileLoginAsync(string email, string password, CancellationToken token)
        {
            using (HttpClient client = BearerClient(null))
            {
                HttpResponseMessage response = await client.PostAsync("/v1.0/api/auth/login", Json(new LoginRequest { Email = email, Password = password, Client = "mobile" }), token).ConfigureAwait(false);
                TestAssert.Equal(HttpStatusCode.OK, response.StatusCode, "mobile login status");
                return await ReadAsync<LoginResponse>(response, token).ConfigureAwait(false);
            }
        }

        /// <summary>
        /// Create a verified user by signing up and following the emailed link.
        /// </summary>
        /// <param name="email">Email.</param>
        /// <param name="password">Password.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Task.</returns>
        public async Task CreateVerifiedUserAsync(string email, string password, CancellationToken token)
        {
            using (HttpClient client = BearerClient(null))
            {
                HttpResponseMessage signup = await client.PostAsync("/v1.0/api/auth/signup", Json(new SignupRequest { Email = email, Password = password, AcceptTerms = true }), token).ConfigureAwait(false);
                TestAssert.Equal(HttpStatusCode.Created, signup.StatusCode, "signup status");
                string verifyToken = LatestTokenFor(email, "evf_");
                HttpResponseMessage verify = await client.PostAsync("/v1.0/api/auth/verify", Json(new TokenRequest { Token = verifyToken }), token).ConfigureAwait(false);
                TestAssert.Equal(HttpStatusCode.OK, verify.StatusCode, "verify status");
            }
        }

        /// <summary>
        /// Enroll a machine over HTTP.
        /// </summary>
        /// <param name="email">Email.</param>
        /// <param name="password">Password.</param>
        /// <param name="name">Machine name.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Enrollment response.</returns>
        public async Task<EnrollResponse> EnrollAsync(string email, string password, string name, CancellationToken token)
        {
            using (HttpClient client = BearerClient(null))
            {
                EnrollRequest request = new EnrollRequest { Email = email, Password = password, MachineName = name, Hostname = name + ".local", Os = "TestOS", MuxVersion = "2.0.0-test", Fingerprint = "fp-" + Guid.NewGuid().ToString("N") };
                HttpResponseMessage response = await client.PostAsync("/v1.0/api/machines/enroll", Json(request), token).ConfigureAwait(false);
                TestAssert.Equal(HttpStatusCode.Created, response.StatusCode, "enroll status");
                return await ReadAsync<EnrollResponse>(response, token).ConfigureAwait(false);
            }
        }

        /// <summary>
        /// The newest token with a prefix in the File outbox messages addressed to an email.
        /// </summary>
        /// <param name="email">Recipient.</param>
        /// <param name="prefix">Token prefix, for example evf_ or pwr_.</param>
        /// <returns>Token.</returns>
        public string LatestTokenFor(string email, string prefix)
        {
            string dir = Settings.Email.File.Directory;
            string? file = Directory.Exists(dir) ? Directory.GetFiles(dir, "*.txt").OrderByDescending(f => f, StringComparer.Ordinal).FirstOrDefault(f => File.ReadAllText(f).Contains("To: " + email, StringComparison.OrdinalIgnoreCase) && File.ReadAllText(f).Contains(prefix, StringComparison.Ordinal)) : null;
            TestAssert.True(file != null, "an email with a " + prefix + " token reached " + email);
            string text = File.ReadAllText(file!);
            int i = text.IndexOf("token=" + prefix, StringComparison.Ordinal);
            int start = i + 6;
            int end = start;
            while (end < text.Length && (Char.IsLetterOrDigit(text[end]) || text[end] == '_')) end++;
            return text.Substring(start, end - start);
        }

        /// <summary>
        /// JSON request content.
        /// </summary>
        /// <param name="value">Value.</param>
        /// <returns>Content.</returns>
        public static StringContent Json(object value)
        {
            return new StringContent(ServerJson.Serialize(value), Encoding.UTF8, "application/json");
        }

        /// <summary>
        /// Read a typed JSON response.
        /// </summary>
        /// <typeparam name="T">Type.</typeparam>
        /// <param name="response">Response.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Value.</returns>
        public static async Task<T> ReadAsync<T>(HttpResponseMessage response, CancellationToken token)
        {
            string body = await response.Content.ReadAsStringAsync(token).ConfigureAwait(false);
            T? value = JsonSerializer.Deserialize<T>(body, ServerJson.Options);
            TestAssert.True(value != null, "response body parses as " + typeof(T).Name + ": " + body);
            return value!;
        }

        /// <summary>
        /// A free loopback TCP port.
        /// </summary>
        /// <returns>Port.</returns>
        public static int FreePort()
        {
            TcpListener listener = new TcpListener(IPAddress.Loopback, 0);
            listener.Start();
            int port = ((IPEndPoint)listener.LocalEndpoint).Port;
            listener.Stop();
            return port;
        }

        /// <summary>
        /// Stop the server.
        /// </summary>
        /// <returns>Task.</returns>
        public async ValueTask DisposeAsync()
        {
            await Server.StopAsync().ConfigureAwait(false);
            Server.Dispose();
        }

        #endregion
    }
}
