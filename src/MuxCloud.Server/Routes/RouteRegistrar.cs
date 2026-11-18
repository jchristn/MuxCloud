namespace MuxCloud.Server.Routes
{
    using System;
    using System.Collections.Generic;
    using System.Threading.Tasks;
    using MuxCloud.Server.Http;
    using WatsonWebserver;
    using WatsonWebserver.Core;
    using WatsonWebserver.Core.OpenApi;
    using WatsonWebserver.Core.Routing;

    /// <summary>
    /// Base class for per-feature route registrars. Anonymous routes go in Watson's pre-authentication table and
    /// authenticated routes in the post-authentication table; every route runs through <see cref="Api.RunAsync"/> and
    /// carries OpenAPI metadata.
    /// </summary>
    public abstract class RouteRegistrar
    {
        #region Public-Members

        /// <summary>
        /// Server.
        /// </summary>
        public MuxCloudServer Server { get; }

        #endregion

        #region Constructors-and-Factories

        /// <summary>
        /// Instantiate.
        /// </summary>
        /// <param name="server">Server.</param>
        /// <exception cref="ArgumentNullException">server is null.</exception>
        protected RouteRegistrar(MuxCloudServer server)
        {
            ArgumentNullException.ThrowIfNull(server);
            Server = server;
        }

        #endregion

        #region Public-Methods

        /// <summary>
        /// Register the feature's routes.
        /// </summary>
        /// <param name="app">Webserver.</param>
        public abstract void Register(Webserver app);

        #endregion

        #region Private-Methods

        /// <summary>
        /// Add a route.
        /// </summary>
        /// <param name="app">Webserver.</param>
        /// <param name="method">Method.</param>
        /// <param name="path">Path template; {name} segments are parameters.</param>
        /// <param name="authenticated">Whether the route needs a signed-in caller (documented security; the handler enforces it).</param>
        /// <param name="tag">OpenAPI tag.</param>
        /// <param name="summary">OpenAPI summary.</param>
        /// <param name="handler">Handler.</param>
        /// <param name="skipBodyCapture">Never capture bodies (credentials and tokens).</param>
        protected void Add(Webserver app, HttpMethod method, string path, bool authenticated, string tag, string summary, Func<HttpContextBase, RequestContext, Task> handler, bool skipBodyCapture = false)
        {
            ArgumentNullException.ThrowIfNull(app);
            ArgumentNullException.ThrowIfNull(handler);
            Func<HttpContextBase, Task> wrapped = (HttpContextBase ctx) => Api.RunAsync(ctx, Server, (RequestContext rc) =>
            {
                rc.PathTemplate = path;
                if (skipBodyCapture) rc.SkipBodyCapture = true;
                return handler(ctx, rc);
            });
            OpenApiRouteMetadata meta = OpenApiRouteMetadata.Create(summary, tag);
            if (authenticated) meta.Security = new List<string> { "bearerAuth", "cookieAuth" };
            RoutingGroup group = authenticated ? app.Routes.PostAuthentication : app.Routes.PreAuthentication;
            if (path.Contains('{', StringComparison.Ordinal)) group.Parameter.Add(method, path, wrapped, null, Guid.NewGuid(), null, meta);
            else group.Static.Add(method, path, wrapped, null, Guid.NewGuid(), null, meta);
        }

        #endregion
    }
}
