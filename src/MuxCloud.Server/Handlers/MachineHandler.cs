namespace MuxCloud.Server.Handlers
{
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Threading.Tasks;
    using MuxCloud.Core.Models;
    using MuxCloud.Core.Requests;
    using MuxCloud.Core.Responses;
    using MuxCloud.Server.Http;
    using WatsonWebserver.Core;

    /// <summary>
    /// Machine enrollment and management.
    /// </summary>
    public class MachineHandler
    {
        #region Private-Members

        private const string _ItemPath = "/v1.0/api/machines/{id}";
        private readonly MuxCloudServer _Server;

        #endregion

        #region Constructors-and-Factories

        /// <summary>
        /// Instantiate.
        /// </summary>
        /// <param name="server">Server.</param>
        public MachineHandler(MuxCloudServer server)
        {
            _Server = server ?? throw new ArgumentNullException(nameof(server));
        }

        #endregion

        #region Public-Methods

        /// <summary>
        /// POST /v1.0/api/machines/enroll.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        /// <param name="rc">Request context.</param>
        /// <returns>Task.</returns>
        public async Task EnrollAsync(HttpContextBase ctx, RequestContext rc)
        {
            EnrollRequest request = Api.ReadJson<EnrollRequest>(ctx, rc);
            EnrollResult result = await _Server.Machines.EnrollAsync(request, rc.SourceIp, ctx.Token).ConfigureAwait(false);
            await Api.SendJsonAsync(ctx, rc, 201, new EnrollResponse { MachineId = result.Machine.Id, MachineSecret = result.Secret, MachineName = result.Machine.Name }).ConfigureAwait(false);
            if (!result.Reenrolled) await _Server.PublishMachineAsync(result.Machine.UserId, result.Machine.Id, "machine.updated").ConfigureAwait(false);
        }

        /// <summary>
        /// GET /v1.0/api/machines.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        /// <param name="rc">Request context.</param>
        /// <returns>Task.</returns>
        public async Task ListAsync(HttpContextBase ctx, RequestContext rc)
        {
            AuthenticatedPrincipal principal = Api.RequireUser(rc);
            bool? online = Api.QueryBool(ctx, "online");
            string? name = Api.Query(ctx, "name");
            bool includeRevoked = Api.QueryBool(ctx, "includeRevoked") ?? false;
            PageRequest page = Api.Page(ctx);
            List<Machine> all = await _Server.Machines.ListForUserAsync(principal.User, ctx.Token).ConfigureAwait(false);
            IEnumerable<MachineDto> filtered = all
                .Where(m => includeRevoked || m.RevokedUtc == null)
                .Where(m => String.IsNullOrWhiteSpace(name) || m.Name.Contains(name, StringComparison.OrdinalIgnoreCase) || m.Hostname.Contains(name, StringComparison.OrdinalIgnoreCase))
                .Select(m => DtoMapper.ToDto(m, _Server.Registry.IsOnline(m.Id)))
                .Where(m => online == null || m.Online == online.Value)
                .OrderByDescending(m => m.Online)
                .ThenByDescending(m => m.LastSeenUtc ?? DateTime.MinValue)
                .ThenBy(m => m.Name, StringComparer.OrdinalIgnoreCase);
            List<MachineDto> list = filtered.ToList();
            PagedResult<MachineDto> result = new PagedResult<MachineDto>
            {
                Items = list.Skip(page.Offset).Take(page.PageSize).ToList(),
                PageNumber = page.PageNumber,
                PageSize = page.PageSize,
                TotalCount = list.Count
            };
            await Api.SendJsonAsync(ctx, rc, 200, result).ConfigureAwait(false);
        }

        /// <summary>
        /// GET /v1.0/api/machines/{id}.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        /// <param name="rc">Request context.</param>
        /// <returns>Task.</returns>
        public async Task GetAsync(HttpContextBase ctx, RequestContext rc)
        {
            AuthenticatedPrincipal principal = Api.RequireUser(rc);
            Machine machine = await _Server.Machines.ReadForUserAsync(principal.User, Api.PathValue(ctx, _ItemPath, "id"), ctx.Token).ConfigureAwait(false);
            await Api.SendJsonAsync(ctx, rc, 200, DtoMapper.ToDto(machine, _Server.Registry.IsOnline(machine.Id))).ConfigureAwait(false);
        }

        /// <summary>
        /// PUT /v1.0/api/machines/{id}.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        /// <param name="rc">Request context.</param>
        /// <returns>Task.</returns>
        public async Task RenameAsync(HttpContextBase ctx, RequestContext rc)
        {
            AuthenticatedPrincipal principal = Api.RequireUser(rc);
            RenameRequest request = Api.ReadJson<RenameRequest>(ctx, rc);
            Machine machine = await _Server.Machines.RenameAsync(principal.User, Api.PathValue(ctx, _ItemPath, "id"), request.Name, ctx.Token).ConfigureAwait(false);
            await Api.SendJsonAsync(ctx, rc, 200, DtoMapper.ToDto(machine, _Server.Registry.IsOnline(machine.Id))).ConfigureAwait(false);
            await _Server.PublishMachineAsync(machine.UserId, machine.Id, "machine.updated").ConfigureAwait(false);
        }

        /// <summary>
        /// POST /v1.0/api/machines/{id}/revoke.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        /// <param name="rc">Request context.</param>
        /// <returns>Task.</returns>
        public async Task RevokeAsync(HttpContextBase ctx, RequestContext rc)
        {
            AuthenticatedPrincipal principal = Api.RequireUser(rc);
            Machine machine = await _Server.Machines.RevokeAsync(principal.User, Api.PathValue(ctx, "/v1.0/api/machines/{id}/revoke", "id"), ctx.Token).ConfigureAwait(false);
            await Api.SendJsonAsync(ctx, rc, 200, DtoMapper.ToDto(machine, false)).ConfigureAwait(false);
        }

        /// <summary>
        /// DELETE /v1.0/api/machines/{id}.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        /// <param name="rc">Request context.</param>
        /// <returns>Task.</returns>
        public async Task DeleteAsync(HttpContextBase ctx, RequestContext rc)
        {
            AuthenticatedPrincipal principal = Api.RequireUser(rc);
            await _Server.Machines.DeleteAsync(principal.User, Api.PathValue(ctx, _ItemPath, "id"), ctx.Token).ConfigureAwait(false);
            await Api.SendNoContentAsync(ctx).ConfigureAwait(false);
        }

        /// <summary>
        /// GET /v1.0/api/machines/{id}/connections.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        /// <param name="rc">Request context.</param>
        /// <returns>Task.</returns>
        public async Task ConnectionsAsync(HttpContextBase ctx, RequestContext rc)
        {
            AuthenticatedPrincipal principal = Api.RequireUser(rc);
            Machine machine = await _Server.Machines.ReadForUserAsync(principal.User, Api.PathValue(ctx, "/v1.0/api/machines/{id}/connections", "id"), ctx.Token).ConfigureAwait(false);
            PagedResult<MachineConnection> page = await _Server.Database.MachineConnections.EnumerateAsync(machine.TenantId, machine.Id, Api.Page(ctx), ctx.Token).ConfigureAwait(false);
            await Api.SendJsonAsync(ctx, rc, 200, page.Map(DtoMapper.ToDto)).ConfigureAwait(false);
        }

        #endregion
    }
}
