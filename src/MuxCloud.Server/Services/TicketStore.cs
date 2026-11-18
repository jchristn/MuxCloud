namespace MuxCloud.Server.Services
{
    using System;
    using System.Collections.Concurrent;
    using System.Collections.Generic;
    using System.Linq;
    using MuxCloud.Core;
    using MuxCloud.Core.Models;
    using MuxCloud.Core.Security;

    /// <summary>
    /// Single-use WebSocket tickets for clients that cannot send cookies or headers on the upgrade (the mobile app). In
    /// memory, per node.
    /// Thread safety: safe to call concurrently.
    /// </summary>
    public class TicketStore
    {
        #region Public-Members

        /// <summary>
        /// Ticket lifetime. Default 30 seconds.
        /// </summary>
        public TimeSpan Lifetime { get; init; } = TimeSpan.FromSeconds(30);

        #endregion

        #region Private-Members

        private readonly ConcurrentDictionary<string, TicketEntry> _Tickets = new ConcurrentDictionary<string, TicketEntry>(StringComparer.Ordinal);

        #endregion

        #region Public-Methods

        /// <summary>
        /// Issue a ticket for a principal.
        /// </summary>
        /// <param name="principal">Caller.</param>
        /// <param name="expiresUtc">Expiry.</param>
        /// <returns>Ticket.</returns>
        public string Issue(AuthenticatedPrincipal principal, out DateTime expiresUtc)
        {
            ArgumentNullException.ThrowIfNull(principal);
            Prune();
            string ticket = SecretHash.CreateToken(Constants.WsTicketPrefix);
            expiresUtc = DateTime.UtcNow + Lifetime;
            _Tickets[ticket] = new TicketEntry { TenantId = principal.User.TenantId, UserId = principal.User.Id, SessionId = principal.Session.Id, ExpiresUtc = expiresUtc };
            return ticket;
        }

        /// <summary>
        /// Redeem a ticket once.
        /// </summary>
        /// <param name="ticket">Ticket.</param>
        /// <returns>Entry, or null when unknown, used, or expired.</returns>
        public TicketEntry? Redeem(string? ticket)
        {
            if (String.IsNullOrWhiteSpace(ticket)) return null;
            if (!_Tickets.TryRemove(ticket, out TicketEntry? entry)) return null;
            return entry.ExpiresUtc > DateTime.UtcNow ? entry : null;
        }

        #endregion

        #region Private-Methods

        private void Prune()
        {
            if (_Tickets.Count < 1000) return;
            DateTime now = DateTime.UtcNow;
            List<string> stale = _Tickets.Where(pair => pair.Value.ExpiresUtc <= now).Select(pair => pair.Key).ToList();
            foreach (string key in stale) _Tickets.TryRemove(key, out _);
        }

        #endregion
    }
}
