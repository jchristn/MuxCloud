namespace MuxCloud.Protocol
{
    using System.Text.Json.Serialization;

    /// <summary>
    /// Source-generated serializer metadata for tunnel frames (AOT and trimming safe): camelCase names, nulls omitted.
    /// </summary>
    [JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase, DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull, PropertyNameCaseInsensitive = true, WriteIndented = false)]
    [JsonSerializable(typeof(TunnelEnvelope))]
    public partial class TunnelJsonContext : JsonSerializerContext
    {
    }
}
