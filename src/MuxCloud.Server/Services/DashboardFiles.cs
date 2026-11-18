namespace MuxCloud.Server.Services
{
    using System;
    using System.Collections.Generic;
    using System.IO;
    using System.Threading.Tasks;
    using WatsonWebserver.Core;

    /// <summary>
    /// Serves the built dashboard single-page app from a directory, with index.html as the fallback for client-side routes,
    /// so the dashboard, API, relay, and sockets share one origin.
    /// Thread safety: safe to call concurrently.
    /// </summary>
    public class DashboardFiles
    {
        #region Public-Members

        /// <summary>
        /// Full path of the dashboard directory.
        /// </summary>
        public string Root { get; }

        /// <summary>
        /// Whether index.html exists.
        /// </summary>
        public bool Available
        {
            get { return File.Exists(Path.Combine(Root, "index.html")); }
        }

        /// <summary>
        /// Content-Security-Policy sent with dashboard HTML. The dashboard loads no inline scripts; styles may be inline.
        /// Relayed machine pages (/m/{machineId}/...) never get this policy, because the machine's own dashboard uses inline
        /// scripts; they get only frame-ancestors 'self'.
        /// </summary>
        public const string ContentSecurityPolicy = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-src 'self'; frame-ancestors 'self'";

        #endregion

        #region Private-Members

        private static readonly Dictionary<string, string> _Types = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            { ".html", "text/html; charset=utf-8" }, { ".js", "text/javascript; charset=utf-8" }, { ".mjs", "text/javascript; charset=utf-8" },
            { ".css", "text/css; charset=utf-8" }, { ".json", "application/json; charset=utf-8" }, { ".svg", "image/svg+xml" },
            { ".png", "image/png" }, { ".jpg", "image/jpeg" }, { ".jpeg", "image/jpeg" }, { ".ico", "image/x-icon" },
            { ".webp", "image/webp" }, { ".woff", "font/woff" }, { ".woff2", "font/woff2" }, { ".txt", "text/plain; charset=utf-8" },
            { ".map", "application/json; charset=utf-8" }, { ".webmanifest", "application/manifest+json" }
        };

        #endregion

        #region Constructors-and-Factories

        /// <summary>
        /// Instantiate.
        /// </summary>
        /// <param name="directory">Dashboard directory; relative paths resolve against the working directory, then the app directory.</param>
        public DashboardFiles(string directory)
        {
            string candidate = Path.GetFullPath(String.IsNullOrWhiteSpace(directory) ? "./dashboard" : directory);
            if (!Directory.Exists(candidate) && !Path.IsPathRooted(directory ?? String.Empty))
            {
                string beside = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, directory ?? "dashboard"));
                if (Directory.Exists(beside)) candidate = beside;
            }

            Root = candidate;
        }

        #endregion

        #region Public-Methods

        /// <summary>
        /// Serve a GET or HEAD for a dashboard path.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        /// <returns>True when a response was sent.</returns>
        public async Task<bool> TryServeAsync(HttpContextBase ctx)
        {
            if (!Available) return false;
            string path = Uri.UnescapeDataString(ctx.Request.Url.RawWithoutQuery ?? "/");
            string relative = path.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
            string full = Path.GetFullPath(Path.Combine(Root, relative));
            bool inside = full.StartsWith(Root + Path.DirectorySeparatorChar, StringComparison.Ordinal) || full == Root;
            bool isFile = inside && File.Exists(full);

            // A missing file that looks like a static asset (under /assets/ or with a file extension) is a 404, not the
            // SPA shell. Otherwise a browser still holding an older build would receive HTML for a module it imports.
            if (!isFile && LooksLikeAsset(relative))
            {
                ctx.Response.StatusCode = 404;
                ctx.Response.ContentType = "text/plain; charset=utf-8";
                ctx.Response.Headers.Add("Cache-Control", "no-store");
                ctx.Response.Headers.Add("X-Content-Type-Options", "nosniff");
                if (ctx.Request.Method == HttpMethod.HEAD) await ctx.Response.Send(ctx.Token).ConfigureAwait(false);
                else await ctx.Response.Send("Not found", ctx.Token).ConfigureAwait(false);
                return true;
            }

            string file = isFile ? full : Path.Combine(Root, "index.html");
            string ext = Path.GetExtension(file);
            ctx.Response.StatusCode = 200;
            ctx.Response.ContentType = _Types.TryGetValue(ext, out string? type) ? type : "application/octet-stream";
            bool hashed = isFile && relative.StartsWith("assets" + Path.DirectorySeparatorChar, StringComparison.Ordinal);
            ctx.Response.Headers.Add("Cache-Control", hashed ? "public, max-age=31536000, immutable" : "no-store");
            ctx.Response.Headers.Add("X-Content-Type-Options", "nosniff");
            if (!isFile || ext.Equals(".html", StringComparison.OrdinalIgnoreCase))
            {
                ctx.Response.Headers.Add("Content-Security-Policy", ContentSecurityPolicy);
                ctx.Response.Headers.Add("X-Frame-Options", "SAMEORIGIN");
                ctx.Response.Headers.Add("Referrer-Policy", "same-origin");
            }

            byte[] bytes = await File.ReadAllBytesAsync(file, ctx.Token).ConfigureAwait(false);
            if (ctx.Request.Method == HttpMethod.HEAD)
            {
                await ctx.Response.Send(ctx.Token).ConfigureAwait(false);
                return true;
            }

            await ctx.Response.Send(bytes, ctx.Token).ConfigureAwait(false);
            return true;
        }

        #endregion

        #region Private-Methods

        private static bool LooksLikeAsset(string relative)
        {
            if (relative.StartsWith("assets" + Path.DirectorySeparatorChar, StringComparison.Ordinal)) return true;
            string ext = Path.GetExtension(relative);
            return !String.IsNullOrEmpty(ext) && _Types.ContainsKey(ext) && !ext.Equals(".html", StringComparison.OrdinalIgnoreCase);
        }

        #endregion
    }
}
