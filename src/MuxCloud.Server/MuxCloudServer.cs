namespace MuxCloud.Server
{
    using System;
    using System.Collections.Generic;
    using System.Threading;
    using System.Threading.Tasks;
    using MuxCloud.Core.Database;
    using MuxCloud.Core.Models;
    using MuxCloud.Core.Responses;
    using MuxCloud.Core.Security;
    using MuxCloud.Core.Services;
    using MuxCloud.Core.Services.Implementations;
    using MuxCloud.Core.Services.Interfaces;
    using MuxCloud.Core.Settings;
    using MuxCloud.Email;
    using MuxCloud.Protocol;
    using MuxCloud.Server.Events;
    using MuxCloud.Server.Http;
    using MuxCloud.Server.Relay;
    using MuxCloud.Server.Routes;
    using MuxCloud.Server.Services;
    using MuxCloud.Server.Tunnel;
    using WatsonWebserver;
    using WatsonWebserver.Core;
    using WatsonWebserver.Core.OpenApi;

    /// <summary>
    /// The Mux Cloud host: REST API, machine tunnels, the relay, account events, and the dashboard, on one Watson server
    /// and one origin.
    /// Thread safety: start and stop from one thread; everything else is safe concurrently.
    /// </summary>
    public class MuxCloudServer : IDisposable
    {
        #region Public-Members

        /// <summary>
        /// Settings.
        /// </summary>
        public MuxCloudSettings Settings { get; }

        /// <summary>
        /// Database (available after <see cref="StartAsync"/>).
        /// </summary>
        public DatabaseDriverBase Database
        {
            get { return _Database ?? throw new InvalidOperationException("The server has not started."); }
        }

        /// <summary>
        /// Account service.
        /// </summary>
        public AccountService Accounts
        {
            get { return _Accounts ?? throw new InvalidOperationException("The server has not started."); }
        }

        /// <summary>
        /// Machine service.
        /// </summary>
        public MachineService Machines
        {
            get { return _Machines ?? throw new InvalidOperationException("The server has not started."); }
        }

        /// <summary>
        /// Entitlement service.
        /// </summary>
        public EntitlementService Entitlements
        {
            get { return _Entitlements ?? throw new InvalidOperationException("The server has not started."); }
        }

        /// <summary>
        /// Audit service.
        /// </summary>
        public AuditService Audit
        {
            get { return _Audit ?? throw new InvalidOperationException("The server has not started."); }
        }

        /// <summary>
        /// Email service.
        /// </summary>
        public EmailService Email { get; }

        /// <summary>
        /// Billing provider.
        /// </summary>
        public IBillingProvider Billing { get; set; } = new NullBillingProvider();

        /// <summary>
        /// Request history capture.
        /// </summary>
        public RequestHistoryService RequestHistory
        {
            get { return _RequestHistory ?? throw new InvalidOperationException("The server has not started."); }
        }

        /// <summary>
        /// Live machine tunnels.
        /// </summary>
        public ConnectionRegistry Registry { get; } = new ConnectionRegistry();

        /// <summary>
        /// Account event sockets.
        /// </summary>
        public EventHub Events { get; } = new EventHub();

        /// <summary>
        /// WebSocket tickets.
        /// </summary>
        public TicketStore Tickets { get; } = new TicketStore();

        /// <summary>
        /// Origin rules.
        /// </summary>
        public OriginPolicy Origins { get; }

        /// <summary>
        /// Dashboard files.
        /// </summary>
        public DashboardFiles Dashboard { get; }

        /// <summary>
        /// URL the listener answers on, for example http://127.0.0.1:8800.
        /// </summary>
        public string BaseUrl
        {
            get { return (Settings.Rest.Ssl ? "https" : "http") + "://" + (Settings.Rest.Hostname == "0.0.0.0" || Settings.Rest.Hostname == "*" ? "127.0.0.1" : Settings.Rest.Hostname) + ":" + Settings.Rest.Port; }
        }

        /// <summary>
        /// Start time.
        /// </summary>
        public DateTime StartedUtc { get; private set; } = DateTime.UtcNow;

        /// <summary>
        /// Log sink for informational lines.
        /// </summary>
        public Action<string>? Logger { get; set; } = null;

        /// <summary>
        /// Log sink for errors.
        /// </summary>
        public Action<string>? ErrorLogger { get; set; } = null;

        #endregion

        #region Private-Members

        private readonly CancellationTokenSource _Stopping = new CancellationTokenSource();
        private DatabaseDriverBase? _Database = null;
        private AccountService? _Accounts = null;
        private MachineService? _Machines = null;
        private EntitlementService? _Entitlements = null;
        private AuditService? _Audit = null;
        private RequestHistoryService? _RequestHistory = null;
        private Webserver? _Webserver = null;
        private Task? _Maintenance = null;
        private bool _Disposed = false;

        #endregion

        #region Constructors-and-Factories

        /// <summary>
        /// Instantiate.
        /// </summary>
        /// <param name="settings">Settings.</param>
        /// <exception cref="ArgumentNullException">settings is null.</exception>
        public MuxCloudServer(MuxCloudSettings settings)
        {
            ArgumentNullException.ThrowIfNull(settings);
            Settings = settings;
            Origins = new OriginPolicy(settings.Server);
            Dashboard = new DashboardFiles(settings.Server.DashboardDirectory);
            Email = new EmailService(settings) { Log = (string line) => Log(line) };
        }

        #endregion

        #region Public-Methods

        /// <summary>
        /// Initialize the database, seed, and start listening.
        /// </summary>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Task.</returns>
        public async Task StartAsync(CancellationToken token = default)
        {
            StartedUtc = DateTime.UtcNow;
            _Database = await DatabaseDriverFactory.CreateAndInitializeAsync(Settings.Database, token).ConfigureAwait(false);
            Log("database " + _Database.DatabaseType + " ready" + (_Database.AppliedMigrations.Count > 0 ? ", applied migrations " + String.Join(",", _Database.AppliedMigrations) : String.Empty));
            await DatabaseSeeder.SeedAsync(_Database, Settings, (string line) => Log(line), token).ConfigureAwait(false);
            await _Database.MachineConnections.CloseOpenAsync(Settings.Server.NodeId, DateTime.UtcNow, token).ConfigureAwait(false);

            TokenProtector protector = new TokenProtector(Settings.Auth.SigningKey);
            _Audit = new AuditService(_Database) { OnError = (string line) => LogError(line) };
            _Entitlements = new EntitlementService(_Database);
            _Accounts = new AccountService(_Database, Settings, protector, Email, _Audit);
            _Machines = new MachineService(_Database, Settings, protector, _Accounts, _Entitlements, Email, _Audit);
            _RequestHistory = new RequestHistoryService(_Database, Settings.RequestHistory, (string line) => LogError(line));
            _Machines.MachineRevoked += OnMachineRevoked;
            _Accounts.UserDisconnected += OnUserDisconnected;
            _Entitlements.Changed += OnEntitlementsChanged;
            MuxCloudTelemetry.RegisterGauges(() => Registry.Count, () => Events.Count);

            _Webserver = BuildWebserver();
            _Webserver.Start(_Stopping.Token);
            _Maintenance = Task.Run(() => MaintenanceAsync(_Stopping.Token), CancellationToken.None);
            Log("listening on " + BaseUrl + " (public " + Settings.Server.PublicUrl + ")" + (Dashboard.Available ? ", dashboard from " + Dashboard.Root : ", no dashboard at " + Dashboard.Root));
        }

        /// <summary>
        /// Drain tunnels (machines reconnect after the drain delay) and stop listening.
        /// </summary>
        /// <returns>Task.</returns>
        public async Task StopAsync()
        {
            try
            {
                await Registry.DrainAsync(Settings.Tunnel.DrainRetryAfterSeconds).ConfigureAwait(false);
            }
            catch (Exception e)
            {
                LogError("drain failed: " + e.Message);
            }

            try
            {
                _Stopping.Cancel();
                if (_Webserver != null && _Webserver.IsListening) _Webserver.Stop();
            }
            catch (Exception e)
            {
                LogError("stop failed: " + e.Message);
            }
        }

        /// <summary>
        /// Publish a machine event with its current state to the owner's event sockets.
        /// </summary>
        /// <param name="userId">Owner.</param>
        /// <param name="machineId">Machine.</param>
        /// <param name="type">machine.online, machine.offline, or machine.updated.</param>
        /// <returns>Task.</returns>
        public async Task PublishMachineAsync(string userId, string machineId, string type)
        {
            try
            {
                Machine? machine = await Database.Machines.ReadAsync(machineId, CancellationToken.None).ConfigureAwait(false);
                if (machine == null) return;
                Events.Publish(userId, new EventMessage { Type = type, Machine = DtoMapper.ToDto(machine, Registry.IsOnline(machineId)) });
            }
            catch (Exception e)
            {
                LogError("event publish failed for " + machineId + ": " + e.Message);
            }
        }

        /// <summary>
        /// Apply a machine.status push.
        /// </summary>
        /// <param name="machine">Machine.</param>
        /// <param name="status">Status.</param>
        /// <returns>Task.</returns>
        public async Task HandleMachineStatusAsync(Machine machine, MachineStatusPayload status)
        {
            ArgumentNullException.ThrowIfNull(machine);
            ArgumentNullException.ThrowIfNull(status);
            try
            {
                await Database.Machines.UpdateStatusAsync(machine.Id, status.ActiveRuns, status.AwaitingApproval, status.RemoteToolApproval, status.MuxVersion, DateTime.UtcNow, CancellationToken.None).ConfigureAwait(false);
                await PublishMachineAsync(machine.UserId, machine.Id, "machine.updated").ConfigureAwait(false);
            }
            catch (Exception e)
            {
                LogError("machine status failed for " + machine.Id + ": " + e.Message);
            }
        }

        /// <summary>
        /// Write an informational log line.
        /// </summary>
        /// <param name="line">Line.</param>
        public void Log(string line)
        {
            try
            {
                Logger?.Invoke(line);
            }
            catch (Exception)
            {
            }
        }

        /// <summary>
        /// Write an error log line.
        /// </summary>
        /// <param name="line">Line.</param>
        public void LogError(string line)
        {
            try
            {
                (ErrorLogger ?? Logger)?.Invoke(line);
            }
            catch (Exception)
            {
            }
        }

        /// <summary>
        /// Release resources.
        /// </summary>
        public void Dispose()
        {
            Dispose(true);
            GC.SuppressFinalize(this);
        }

        #endregion

        #region Private-Methods

        /// <summary>
        /// Release resources.
        /// </summary>
        /// <param name="disposing">Whether managed resources are released.</param>
        protected virtual void Dispose(bool disposing)
        {
            if (_Disposed) return;
            if (disposing)
            {
                try
                {
                    _Stopping.Cancel();
                    if (_Webserver != null && _Webserver.IsListening) _Webserver.Stop();
                    _Webserver?.Dispose();
                }
                catch (Exception)
                {
                }

                _Database?.Dispose();
                _Stopping.Dispose();
            }

            _Disposed = true;
        }

        private Webserver BuildWebserver()
        {
            WebserverSettings settings = new WebserverSettings(Settings.Rest.Hostname, Settings.Rest.Port, Settings.Rest.Ssl);
            settings.Headers.DefaultHeaders.Clear();
            settings.WebSockets.Enable = true;
            settings.WebSockets.MaxMessageSize = 32 * 1024 * 1024;
            settings.Telemetry.Enable = Settings.Telemetry.Enable;
            settings.Telemetry.EnableMetrics = Settings.Telemetry.EnableMetrics;
            settings.Telemetry.EnableTraces = Settings.Telemetry.EnableTraces;
            settings.Telemetry.PropagateContext = Settings.Telemetry.PropagateContext;
            Webserver app = new Webserver(settings, DefaultRouteAsync);
            app.Routes.AuthenticateRequest = async (HttpContextBase ctx) => await RequestContextFactory.GetAsync(ctx, this).ConfigureAwait(false);
            app.Routes.Preflight = PreflightAsync;
            app.Routes.PostRouting = PostRoutingAsync;
            ConfigureOpenApi(app);

            new HealthRoutes(this).Register(app);
            new AuthRoutes(this).Register(app);
            new AccountRoutes(this).Register(app);
            new MachineRoutes(this).Register(app);
            new BillingRoutes(this).Register(app);
            new TicketRoutes(this).Register(app);
            new AdminRoutes(this).Register(app);
            new RequestHistoryRoutes(this).Register(app);

            app.WebSocket(TunnelProtocol.TunnelPath, new TunnelEndpoint(this).HandleAsync);
            app.WebSocket("/v1.0/events", new EventsEndpoint(this).HandleAsync);
            app.WebSocket(RelayWebSocketHandler.Path, new RelayWebSocketHandler(this).HandleAsync);
            return app;
        }

        private void ConfigureOpenApi(Webserver app)
        {
            OpenApiSettings openApi = new OpenApiSettings
            {
                DocumentPath = "/openapi.json",
                SwaggerUiPath = "/swagger",
                EnableSwaggerUi = true,
                Info = new OpenApiInfo
                {
                    Title = "Mux Cloud API",
                    Version = MuxCloud.Core.Constants.Version,
                    Description = "Accounts, machines, billing, and the relay to your mux machines. See REST_API.md and WEBSOCKETS_API.md."
                },
                IncludePreAuthRoutes = true,
                IncludePostAuthRoutes = true,
                IncludeContentRoutes = false
            };
            openApi.SecuritySchemes["bearerAuth"] = new OpenApiSecurityScheme { Type = "http", Scheme = "bearer", BearerFormat = "opaque", Description = "Access token from POST /v1.0/api/auth/login with client mobile." };
            openApi.SecuritySchemes["cookieAuth"] = new OpenApiSecurityScheme { Type = "apiKey", In = "cookie", Name = MuxCloud.Core.Constants.SessionCookieName, Description = "Session cookie set by POST /v1.0/api/auth/login with client web." };
            app.UseOpenApi(openApi);
        }

        private async Task DefaultRouteAsync(HttpContextBase ctx)
        {
            string path = ctx.Request.Url.RawWithoutQuery ?? "/";
            if (RelayHandler.TryParse(path, out string machineId, out string localPath))
            {
                RelayHandler relay = new RelayHandler(this);
                await Api.RunAsync(ctx, this, (RequestContext rc) => relay.HandleAsync(ctx, rc, machineId, localPath)).ConfigureAwait(false);
                return;
            }

            bool api = path.StartsWith("/v1.0/", StringComparison.OrdinalIgnoreCase);
            if (!api && (ctx.Request.Method == HttpMethod.GET || ctx.Request.Method == HttpMethod.HEAD))
            {
                try
                {
                    if (await Dashboard.TryServeAsync(ctx).ConfigureAwait(false)) return;
                }
                catch (Exception e)
                {
                    LogError("dashboard file failed for " + path + ": " + e.Message);
                }
            }

            RequestContext context = await RequestContextFactory.GetAsync(ctx, this).ConfigureAwait(false);
            await Api.SendErrorAsync(ctx, context, 404, "NotFound", "No route for " + ctx.Request.Method + " " + path + ".").ConfigureAwait(false);
        }

        private async Task PreflightAsync(HttpContextBase ctx)
        {
            ApplyCors(ctx);
            ctx.Response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, HEAD");
            ctx.Response.Headers.Add("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Api-Key");
            ctx.Response.Headers.Add("Access-Control-Max-Age", "86400");
            ctx.Response.StatusCode = 204;
            await ctx.Response.Send(ctx.Token).ConfigureAwait(false);
        }

        private Task PostRoutingAsync(HttpContextBase ctx)
        {
            try
            {
                ctx.Timestamp.End = DateTime.UtcNow;
                ApplyCors(ctx);
                RequestContext? rc = ctx.Metadata as RequestContext;
                string path = rc != null && rc.IsRelay ? "/m/{machineId}/*" : (ctx.Request.Url.RawWithoutQuery ?? String.Empty);
                Log(ctx.Request.Method + " " + path + " " + ctx.Response.StatusCode + " (" + (ctx.Timestamp.TotalMs.HasValue ? ctx.Timestamp.TotalMs.Value.ToString("F2", System.Globalization.CultureInfo.InvariantCulture) : "?") + "ms)");
                _RequestHistory?.Capture(ctx);
            }
            catch (Exception e)
            {
                LogError("post-routing failed: " + e.Message);
            }

            return Task.CompletedTask;
        }

        private void ApplyCors(HttpContextBase ctx)
        {
            string? origin = ctx.Request.RetrieveHeaderValue("Origin");
            if (String.IsNullOrEmpty(origin) || !Origins.IsAllowed(origin) || ctx.Response.ResponseStarted) return;
            ctx.Response.Headers.Add("Access-Control-Allow-Origin", origin);
            ctx.Response.Headers.Add("Access-Control-Allow-Credentials", "true");
            ctx.Response.Headers.Add("Vary", "Origin");
        }

        private async Task MaintenanceAsync(CancellationToken token)
        {
            try
            {
                using (PeriodicTimer timer = new PeriodicTimer(TimeSpan.FromHours(1)))
                {
                    do
                    {
                        try
                        {
                            int pruned = await RequestHistory.PruneAsync(token).ConfigureAwait(false);
                            await Database.OneTimeTokens.DeleteExpiredAsync(DateTime.UtcNow.AddDays(-1), token).ConfigureAwait(false);
                            if (pruned > 0) Log("pruned " + pruned + " request history entries");
                        }
                        catch (Exception e) when (!(e is OperationCanceledException))
                        {
                            LogError("maintenance failed: " + e.Message);
                        }
                    }
                    while (await timer.WaitForNextTickAsync(token).ConfigureAwait(false));
                }
            }
            catch (OperationCanceledException)
            {
            }
        }

        private void OnMachineRevoked(object? sender, MachineRevokedEventArgs e)
        {
            _ = Task.Run(async () =>
            {
                MachineTunnel? tunnel = Registry.Get(e.MachineId);
                if (tunnel != null) await tunnel.CloseAsync(TunnelCloseCodes.Revoked, e.Deleted ? "machine removed" : "machine revoked").ConfigureAwait(false);
                if (e.Deleted) Events.Publish(e.UserId, new EventMessage { Type = "machine.removed", MachineId = e.MachineId });
                else await PublishMachineAsync(e.UserId, e.MachineId, "machine.updated").ConfigureAwait(false);
            });
        }

        private void OnUserDisconnected(object? sender, User user)
        {
            _ = Task.Run(async () =>
            {
                List<MachineTunnel> tunnels = Registry.ForUser(user.Id);
                foreach (MachineTunnel tunnel in tunnels) await tunnel.CloseAsync(TunnelCloseCodes.Revoked, "account disabled").ConfigureAwait(false);
                await Events.DisconnectUserAsync(user.Id).ConfigureAwait(false);
            });
        }

        private void OnEntitlementsChanged(object? sender, string accountId)
        {
            _ = Task.Run(async () =>
            {
                try
                {
                    Account? account = await Database.Accounts.ReadAsync(accountId, CancellationToken.None).ConfigureAwait(false);
                    if (account == null) return;
                    EffectiveEntitlements entitlements = await Entitlements.GetAsync(accountId, CancellationToken.None).ConfigureAwait(false);
                    Events.Publish(account.OwnerUserId, new EventMessage { Type = "subscription.updated", Entitlements = entitlements });
                }
                catch (Exception ex)
                {
                    LogError("entitlement event failed for " + accountId + ": " + ex.Message);
                }
            });
        }

        #endregion
    }
}
