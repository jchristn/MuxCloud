namespace MuxCloud.Core.Requests
{
    using System;
    using System.Text.Json.Serialization;

    /// <summary>
    /// Body of PUT /v1.0/api/machines/{id}.
    /// </summary>
    public class RenameRequest
    {
        #region Public-Members

        /// <summary>
        /// New name.
        /// </summary>
        [JsonPropertyName("name")]
        public string? Name { get; set; } = null;

        #endregion
    }
}
