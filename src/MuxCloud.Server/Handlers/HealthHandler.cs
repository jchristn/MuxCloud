namespace MuxCloud.Server.Handlers
{
    using System;
    using System.Threading.Tasks;
    using MuxCloud.Core.Responses;
    using MuxCloud.Server.Http;
    using WatsonWebserver.Core;

    /// <summary>
    /// Health.
    /// </summary>
    public class HealthHandler
    {
        #region Private-Members

        private readonly MuxCloudServer _Server;

        #endregion

        #region Constructors-and-Factories

        /// <summary>
        /// Instantiate.
        /// </summary>
        /// <param name="server">Server.</param>
        public HealthHandler(MuxCloudServer server)
        {
            _Server = server ?? throw new ArgumentNullException(nameof(server));
        }

        #endregion

        #region Public-Methods

        /// <summary>
        /// GET /v1.0/api/health.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        /// <param name="rc">Request context.</param>
        /// <returns>Task.</returns>
        public Task HealthAsync(HttpContextBase ctx, RequestContext rc)
        {
            return Api.SendJsonAsync(ctx, rc, 200, new HealthResponse { Version = MuxCloud.Core.Constants.Version, Utc = DateTime.UtcNow });
        }

        #endregion
    }
}
