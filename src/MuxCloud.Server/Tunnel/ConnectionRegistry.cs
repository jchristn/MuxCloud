namespace MuxCloud.Server.Tunnel
{
    using System;
    using System.Collections.Concurrent;
    using System.Collections.Generic;
    using System.Linq;
    using System.Threading.Tasks;
    using MuxCloud.Protocol;

    /// <summary>
    /// Live tunnels by machine. Replacing a machine's tunnel returns the previous one so the caller can close it with 4409;
    /// removing a tunnel only removes that exact instance, so a stale connection's cleanup never disconnects its replacement.
    /// Thread safety: safe to call concurrently.
    /// </summary>
    public class ConnectionRegistry
    {
        #region Public-Members

        /// <summary>
        /// Live tunnels.
        /// </summary>
        public int Count
        {
            get { return _Tunnels.Count; }
        }

        /// <summary>
        /// Open streams and channels across every tunnel.
        /// </summary>
        public int OpenStreams
        {
            get { return _Tunnels.Values.Sum(t => t.OpenCount); }
        }

        #endregion

        #region Private-Members

        private readonly ConcurrentDictionary<string, MachineTunnel> _Tunnels = new ConcurrentDictionary<string, MachineTunnel>(StringComparer.Ordinal);

        #endregion

        #region Public-Methods

        /// <summary>
        /// Make a tunnel the machine's current one.
        /// </summary>
        /// <param name="tunnel">New tunnel.</param>
        /// <returns>The tunnel it replaced, or null.</returns>
        public MachineTunnel? Register(MachineTunnel tunnel)
        {
            ArgumentNullException.ThrowIfNull(tunnel);
            MachineTunnel? previous = null;
            _Tunnels.AddOrUpdate(tunnel.MachineId, tunnel, (string key, MachineTunnel existing) =>
            {
                previous = existing;
                return tunnel;
            });
            return previous != null && !ReferenceEquals(previous, tunnel) ? previous : null;
        }

        /// <summary>
        /// Remove a tunnel only if it is still the machine's current one.
        /// </summary>
        /// <param name="tunnel">Tunnel.</param>
        /// <returns>True when removed (the machine is now offline).</returns>
        public bool Unregister(MachineTunnel tunnel)
        {
            ArgumentNullException.ThrowIfNull(tunnel);
            return _Tunnels.TryRemove(new KeyValuePair<string, MachineTunnel>(tunnel.MachineId, tunnel));
        }

        /// <summary>
        /// The machine's current tunnel.
        /// </summary>
        /// <param name="machineId">Machine.</param>
        /// <returns>Tunnel, or null when offline.</returns>
        public MachineTunnel? Get(string machineId)
        {
            return machineId != null && _Tunnels.TryGetValue(machineId, out MachineTunnel? tunnel) ? tunnel : null;
        }

        /// <summary>
        /// Whether a machine is online.
        /// </summary>
        /// <param name="machineId">Machine.</param>
        /// <returns>True when a tunnel is registered.</returns>
        public bool IsOnline(string machineId)
        {
            return machineId != null && _Tunnels.ContainsKey(machineId);
        }

        /// <summary>
        /// Every live tunnel of a user.
        /// </summary>
        /// <param name="userId">User.</param>
        /// <returns>Tunnels.</returns>
        public List<MachineTunnel> ForUser(string userId)
        {
            return _Tunnels.Values.Where(t => t.UserId == userId).ToList();
        }

        /// <summary>
        /// Tell every machine to reconnect later and close its tunnel with 4503.
        /// </summary>
        /// <param name="retryAfterSeconds">Seconds before reconnecting.</param>
        /// <returns>Task.</returns>
        public async Task DrainAsync(int retryAfterSeconds)
        {
            List<MachineTunnel> all = _Tunnels.Values.ToList();
            foreach (MachineTunnel tunnel in all)
            {
                await tunnel.SendAsync(TunnelProtocol.CreateGoAway("server draining", retryAfterSeconds)).ConfigureAwait(false);
            }

            foreach (MachineTunnel tunnel in all)
            {
                await tunnel.CloseAsync(TunnelCloseCodes.Draining, "server draining").ConfigureAwait(false);
            }
        }

        #endregion
    }
}
