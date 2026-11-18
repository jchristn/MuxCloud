namespace MuxCloud.Server.Handlers
{
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Threading.Tasks;
    using MuxCloud.Core.Models;
    using MuxCloud.Core.Requests;
    using MuxCloud.Core.Responses;
    using MuxCloud.Core.Services;
    using MuxCloud.Server.Http;
    using WatsonWebserver.Core;

    /// <summary>
    /// Push device registration. Responses never include the push token.
    /// </summary>
    public class DeviceHandler
    {
        #region Private-Members

        private readonly MuxCloudServer _Server;

        #endregion

        #region Constructors-and-Factories

        /// <summary>
        /// Instantiate.
        /// </summary>
        /// <param name="server">Server.</param>
        public DeviceHandler(MuxCloudServer server)
        {
            _Server = server ?? throw new ArgumentNullException(nameof(server));
        }

        #endregion

        #region Public-Methods

        /// <summary>
        /// POST /v1.0/api/devices: 201 for a new device, 200 when the token was already registered.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        /// <param name="rc">Request context.</param>
        /// <returns>Task.</returns>
        public async Task RegisterAsync(HttpContextBase ctx, RequestContext rc)
        {
            AuthenticatedPrincipal principal = Api.RequireUser(rc);
            DeviceRegisterRequest request = Api.ReadJson<DeviceRegisterRequest>(ctx, rc);
            DeviceRegistration result = await _Server.Devices.RegisterAsync(principal.User, request, ctx.Token).ConfigureAwait(false);
            await Api.SendJsonAsync(ctx, rc, result.Created ? 201 : 200, ToDto(result.Device)).ConfigureAwait(false);
        }

        /// <summary>
        /// GET /v1.0/api/devices.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        /// <param name="rc">Request context.</param>
        /// <returns>Task.</returns>
        public async Task ListAsync(HttpContextBase ctx, RequestContext rc)
        {
            AuthenticatedPrincipal principal = Api.RequireUser(rc);
            List<Device> devices = await _Server.Devices.ListAsync(principal.User, ctx.Token).ConfigureAwait(false);
            await Api.SendJsonAsync(ctx, rc, 200, devices.Select(ToDto).ToList()).ConfigureAwait(false);
        }

        /// <summary>
        /// DELETE /v1.0/api/devices/{id}.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        /// <param name="rc">Request context.</param>
        /// <returns>Task.</returns>
        public async Task DeleteAsync(HttpContextBase ctx, RequestContext rc)
        {
            AuthenticatedPrincipal principal = Api.RequireUser(rc);
            await _Server.Devices.DeleteAsync(principal.User, Api.PathValue(ctx, "/v1.0/api/devices/{id}", "id"), ctx.Token).ConfigureAwait(false);
            await Api.SendNoContentAsync(ctx).ConfigureAwait(false);
        }

        #endregion

        #region Private-Methods

        private static DeviceDto ToDto(Device device)
        {
            return new DeviceDto { Id = device.Id, Platform = device.Platform, Name = device.Name, CreatedUtc = device.CreatedUtc };
        }

        #endregion
    }
}
