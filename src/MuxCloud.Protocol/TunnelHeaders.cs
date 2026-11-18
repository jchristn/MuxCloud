namespace MuxCloud.Protocol
{
    using System;
    using System.Collections.Generic;

    /// <summary>
    /// Header filtering shared by both ends of the relay. Hop-by-hop headers never cross the tunnel, and cloud credentials
    /// never reach the machine.
    /// Thread safety: immutable; safe to share.
    /// </summary>
    public static class TunnelHeaders
    {
        #region Public-Members

        /// <summary>
        /// Headers never forwarded in either direction.
        /// </summary>
        public static readonly IReadOnlyCollection<string> HopByHop = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "Connection", "Keep-Alive", "Proxy-Connection", "Transfer-Encoding", "TE", "Trailer", "Upgrade",
            "Content-Length", "Host", "Proxy-Authenticate", "Proxy-Authorization",
            "Sec-WebSocket-Key", "Sec-WebSocket-Version", "Sec-WebSocket-Extensions", "Sec-WebSocket-Accept", "Sec-WebSocket-Protocol"
        };

        /// <summary>
        /// Request headers the cloud strips before relaying because they carry cloud credentials or cloud state.
        /// </summary>
        public static readonly IReadOnlyCollection<string> CloudOnlyRequest = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "Cookie", "Authorization", "X-Api-Key", "X-Token", "X-Access-Key", "X-Secret-Key", "X-Mux-Relay", "X-Mux-Base-Path",
            "X-Forwarded-For", "X-Forwarded-Proto", "X-Forwarded-Host", "X-Real-IP", "Forwarded", "Origin", "Referer"
        };

        /// <summary>
        /// Response headers the cloud drops before returning a relayed response to the client.
        /// </summary>
        public static readonly IReadOnlyCollection<string> MachineOnlyResponse = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "Set-Cookie", "Access-Control-Allow-Origin", "Access-Control-Allow-Credentials", "Access-Control-Allow-Headers",
            "Access-Control-Allow-Methods", "Access-Control-Expose-Headers", "Access-Control-Max-Age", "Server"
        };

        #endregion

        #region Public-Methods

        /// <summary>
        /// Copy headers, dropping hop-by-hop headers and any in the extra exclusion set.
        /// </summary>
        /// <param name="source">Headers to copy; null yields an empty dictionary.</param>
        /// <param name="exclude">Additional names to drop, or null.</param>
        /// <returns>Filtered copy with case-insensitive keys.</returns>
        public static Dictionary<string, string> Filter(IEnumerable<KeyValuePair<string, string>>? source, IReadOnlyCollection<string>? exclude)
        {
            Dictionary<string, string> result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            if (source == null) return result;
            HashSet<string> drop = new HashSet<string>(HopByHop, StringComparer.OrdinalIgnoreCase);
            if (exclude != null) drop.UnionWith(exclude);
            foreach (KeyValuePair<string, string> header in source)
            {
                if (String.IsNullOrWhiteSpace(header.Key) || drop.Contains(header.Key)) continue;
                result[header.Key] = header.Value ?? String.Empty;
            }

            return result;
        }

        #endregion
    }
}
