namespace MuxCloud.Core.Helpers
{
    using System;
    using System.Collections.Generic;
    using System.Text;
    using System.Text.Json;

    /// <summary>
    /// Converts captured HTTP headers between a name to value map (the API shape) and the "Name: value" text lines
    /// stored in the request history table.
    /// Thread safety: stateless; safe to call concurrently.
    /// </summary>
    public static class HeaderLines
    {
        #region Public-Members

        /// <summary>
        /// Maximum stored length of the formatted text.
        /// </summary>
        public const int MaxLength = 16384;

        #endregion

        #region Public-Methods

        /// <summary>
        /// Parse stored header text into a map. Accepts "Name: value" lines and, defensively, a JSON object.
        /// Repeated names are joined with ", ".
        /// </summary>
        /// <param name="text">Stored text; null or empty yields an empty map.</param>
        /// <returns>Headers by name, case-insensitive.</returns>
        public static Dictionary<string, string> Parse(string? text)
        {
            Dictionary<string, string> result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            if (String.IsNullOrWhiteSpace(text)) return result;
            string trimmed = text.Trim();
            if (trimmed.StartsWith('{'))
            {
                try
                {
                    using (JsonDocument doc = JsonDocument.Parse(trimmed))
                    {
                        foreach (JsonProperty property in doc.RootElement.EnumerateObject())
                        {
                            Add(result, property.Name, property.Value.ValueKind == JsonValueKind.String ? property.Value.GetString() ?? String.Empty : property.Value.GetRawText());
                        }
                    }

                    return result;
                }
                catch (JsonException)
                {
                    result.Clear();
                }
            }

            foreach (string raw in text.Split('\n'))
            {
                string line = raw.TrimEnd('\r');
                if (line.Length == 0) continue;
                int colon = line.IndexOf(':');
                if (colon <= 0) continue;
                Add(result, line.Substring(0, colon).Trim(), line.Substring(colon + 1).Trim());
            }

            return result;
        }

        /// <summary>
        /// Format a header map as "Name: value" lines for storage, capped at <see cref="MaxLength"/>.
        /// </summary>
        /// <param name="headers">Headers; null yields an empty string.</param>
        /// <returns>Text lines.</returns>
        public static string Format(IDictionary<string, string>? headers)
        {
            if (headers == null || headers.Count == 0) return String.Empty;
            StringBuilder sb = new StringBuilder();
            foreach (KeyValuePair<string, string> header in headers)
            {
                if (String.IsNullOrEmpty(header.Key)) continue;
                sb.Append(header.Key).Append(": ").Append((header.Value ?? String.Empty).Replace('\n', ' ').Replace('\r', ' ')).Append('\n');
            }

            string text = sb.ToString();
            return text.Length <= MaxLength ? text : text.Substring(0, MaxLength);
        }

        #endregion

        #region Private-Methods

        private static void Add(Dictionary<string, string> map, string name, string value)
        {
            if (String.IsNullOrEmpty(name)) return;
            map[name] = map.TryGetValue(name, out string? existing) ? existing + ", " + value : value;
        }

        #endregion
    }
}
