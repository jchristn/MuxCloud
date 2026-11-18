namespace MuxCloud.Core.Responses
{
    using System;
    using System.Linq;
    using MuxCloud.Core.Models;

    /// <summary>
    /// Projects stored models into API response objects. Secrets and hashes never leave through these.
    /// Thread safety: stateless.
    /// </summary>
    public static class DtoMapper
    {
        #region Public-Methods

        /// <summary>
        /// User to response.
        /// </summary>
        /// <param name="user">User.</param>
        /// <returns>Response.</returns>
        public static UserDto ToDto(User user)
        {
            ArgumentNullException.ThrowIfNull(user);
            return new UserDto
            {
                Id = user.Id,
                Email = user.Email,
                FirstName = user.FirstName,
                LastName = user.LastName,
                EmailVerified = user.EmailVerifiedUtc != null,
                IsAdmin = user.IsAdmin,
                Active = user.Active,
                TenantId = user.TenantId,
                AccountId = user.AccountId,
                LastLoginUtc = user.LastLoginUtc,
                CreatedUtc = user.CreatedUtc
            };
        }

        /// <summary>
        /// Session to response.
        /// </summary>
        /// <param name="session">Session.</param>
        /// <param name="currentSessionId">The caller's session, to flag it.</param>
        /// <returns>Response.</returns>
        public static SessionDto ToDto(AuthSession session, string? currentSessionId)
        {
            ArgumentNullException.ThrowIfNull(session);
            return new SessionDto
            {
                Id = session.Id,
                Client = session.Client,
                DeviceName = session.DeviceName,
                SourceIp = session.SourceIp,
                UserAgent = session.UserAgent,
                CreatedUtc = session.CreatedUtc,
                LastUsedUtc = session.LastUsedUtc,
                ExpiresUtc = session.RefreshExpiresUtc,
                Current = session.Id == currentSessionId
            };
        }

        /// <summary>
        /// Machine to response.
        /// </summary>
        /// <param name="machine">Machine.</param>
        /// <param name="online">Whether a tunnel is connected.</param>
        /// <returns>Response.</returns>
        public static MachineDto ToDto(Machine machine, bool online)
        {
            ArgumentNullException.ThrowIfNull(machine);
            return new MachineDto
            {
                Id = machine.Id,
                Name = machine.Name,
                Hostname = machine.Hostname,
                Os = machine.Os,
                MuxVersion = machine.MuxVersion,
                ProtocolVersion = machine.ProtocolVersion,
                Online = online,
                LastSeenUtc = machine.LastSeenUtc,
                LastConnectedUtc = machine.LastConnectedUtc,
                LastDisconnectedUtc = machine.LastDisconnectedUtc,
                ActiveRuns = online ? machine.ActiveRuns : 0,
                AwaitingApproval = online ? machine.AwaitingApproval : 0,
                RemoteToolApproval = machine.RemoteToolApproval,
                SecretLast4 = machine.SecretLast4,
                Revoked = machine.RevokedUtc != null,
                UserId = machine.UserId,
                CreatedUtc = machine.CreatedUtc
            };
        }

        /// <summary>
        /// Connection to response.
        /// </summary>
        /// <param name="connection">Connection.</param>
        /// <returns>Response.</returns>
        public static MachineConnectionDto ToDto(MachineConnection connection)
        {
            ArgumentNullException.ThrowIfNull(connection);
            return new MachineConnectionDto
            {
                Id = connection.Id,
                MachineId = connection.MachineId,
                NodeId = connection.NodeId,
                RemoteIp = connection.RemoteIp,
                ProtocolVersion = connection.ProtocolVersion,
                MuxVersion = connection.MuxVersion,
                ConnectedUtc = connection.ConnectedUtc,
                DisconnectedUtc = connection.DisconnectedUtc,
                CloseCode = connection.CloseCode,
                CloseReason = connection.CloseReason,
                BytesIn = connection.BytesIn,
                BytesOut = connection.BytesOut
            };
        }

        /// <summary>
        /// Override to response.
        /// </summary>
        /// <param name="item">Override.</param>
        /// <returns>Response.</returns>
        public static EntitlementOverrideDto ToDto(EntitlementOverride item)
        {
            ArgumentNullException.ThrowIfNull(item);
            return new EntitlementOverrideDto { Id = item.Id, AccountId = item.AccountId, FeatureKey = item.FeatureKey, Limit = item.LimitValue, Reason = item.Reason, ExpiresUtc = item.ExpiresUtc, CreatedUtc = item.CreatedUtc };
        }

        /// <summary>
        /// Audit record to response.
        /// </summary>
        /// <param name="record">Record.</param>
        /// <param name="principal">Who acted (email, user identifier, or system).</param>
        /// <returns>Response.</returns>
        public static AuditRecordDto ToDto(AuditRecord record, string principal)
        {
            ArgumentNullException.ThrowIfNull(record);
            return new AuditRecordDto
            {
                Id = record.Id,
                EventType = record.EventType,
                Result = record.Result,
                Reason = record.Reason,
                UserId = record.UserId,
                TenantId = record.TenantId,
                Principal = principal ?? String.Empty,
                ResourceType = record.ResourceType,
                ResourceId = record.ResourceId,
                SourceIp = record.SourceIp,
                RequestId = record.RequestId,
                Message = record.Message,
                CreatedUtc = record.CreatedUtc
            };
        }

        /// <summary>
        /// Plan to response.
        /// </summary>
        /// <param name="plan">Plan.</param>
        /// <returns>Response.</returns>
        public static PlanDto ToDto(Plan plan)
        {
            ArgumentNullException.ThrowIfNull(plan);
            return new PlanDto
            {
                Id = plan.Id,
                Code = plan.Code,
                Name = plan.Name,
                PriceCents = plan.PriceCents,
                Currency = plan.Currency,
                Interval = plan.BillingInterval,
                Active = plan.Active,
                Public = plan.IsPublic,
                Features = plan.Features.Select(f => new PlanFeatureDto { Key = f.FeatureKey, Limit = f.LimitValue }).ToList()
            };
        }

        /// <summary>
        /// Subscription to response.
        /// </summary>
        /// <param name="subscription">Subscription.</param>
        /// <param name="planCode">Plan code.</param>
        /// <returns>Response.</returns>
        public static SubscriptionDto ToDto(Subscription subscription, string planCode)
        {
            ArgumentNullException.ThrowIfNull(subscription);
            return new SubscriptionDto
            {
                Id = subscription.Id,
                PlanId = subscription.PlanId,
                PlanCode = planCode ?? String.Empty,
                Status = subscription.Status.ToString(),
                Provider = subscription.Provider,
                CurrentPeriodEndUtc = subscription.CurrentPeriodEndUtc,
                CancelAtPeriodEnd = subscription.CancelAtPeriodEnd,
                CreatedUtc = subscription.CreatedUtc
            };
        }

        #endregion
    }
}
