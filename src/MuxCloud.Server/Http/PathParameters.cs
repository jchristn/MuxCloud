namespace MuxCloud.Server.Http
{
    using System;
    using System.Collections.Generic;

    /// <summary>
    /// Extracts {name} values from a raw request path using a route template. Values keep their original case (Watson's
    /// WebSocket routing lowercases captured values; identifiers here are case-sensitive).
    /// Thread safety: stateless.
    /// </summary>
    public static class PathParameters
    {
        #region Public-Methods

        /// <summary>
        /// Extract parameters.
        /// </summary>
        /// <param name="template">Template, for example /v1.0/api/machines/{id}.</param>
        /// <param name="rawPath">Raw request path without the query.</param>
        /// <returns>Values by name, URL-decoded; empty when the path does not match.</returns>
        public static Dictionary<string, string> Extract(string template, string? rawPath)
        {
            Dictionary<string, string> values = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            string[] t = (template ?? String.Empty).Trim('/').Split('/');
            string[] p = (rawPath ?? String.Empty).Trim('/').Split('/');
            if (t.Length != p.Length) return values;
            for (int i = 0; i < t.Length; i++)
            {
                if (t[i].StartsWith("{", StringComparison.Ordinal) && t[i].EndsWith("}", StringComparison.Ordinal))
                {
                    values[t[i].Substring(1, t[i].Length - 2)] = Uri.UnescapeDataString(p[i]);
                }
                else if (!String.Equals(t[i], p[i], StringComparison.OrdinalIgnoreCase))
                {
                    values.Clear();
                    return values;
                }
            }

            return values;
        }

        #endregion
    }
}
