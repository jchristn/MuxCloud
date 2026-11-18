namespace MuxCloud.Server.Http
{
    using System;
    using System.Text.Json;
    using System.Text.Json.Serialization;
    using MuxCloud.Core.Exceptions;

    /// <summary>
    /// JSON settings for the REST API: camelCase, enums as strings, case-insensitive reads.
    /// Thread safety: immutable options; safe to share.
    /// </summary>
    public static class ServerJson
    {
        #region Public-Members

        /// <summary>
        /// Serializer options.
        /// </summary>
        public static readonly JsonSerializerOptions Options = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            PropertyNameCaseInsensitive = true,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
            Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }
        };

        #endregion

        #region Public-Methods

        /// <summary>
        /// Serialize a value.
        /// </summary>
        /// <param name="value">Value.</param>
        /// <returns>JSON.</returns>
        public static string Serialize(object? value)
        {
            return JsonSerializer.Serialize(value, Options);
        }

        /// <summary>
        /// Parse a request body into a typed object.
        /// </summary>
        /// <typeparam name="T">Request type.</typeparam>
        /// <param name="body">Body text.</param>
        /// <returns>Value.</returns>
        /// <exception cref="ApiException">400 when the body is missing or not valid JSON for the type.</exception>
        public static T Deserialize<T>(string? body) where T : class, new()
        {
            if (String.IsNullOrWhiteSpace(body)) return new T();
            try
            {
                return JsonSerializer.Deserialize<T>(body, Options) ?? new T();
            }
            catch (JsonException e)
            {
                throw ApiException.BadRequest("The request body is not valid JSON: " + e.Message);
            }
        }

        #endregion
    }
}
