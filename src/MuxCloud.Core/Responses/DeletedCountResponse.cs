namespace MuxCloud.Core.Responses
{
    using System;
    using System.Text.Json.Serialization;

    /// <summary>
    /// Response of bulk deletes.
    /// </summary>
    public class DeletedCountResponse
    {
        #region Public-Members

        /// <summary>
        /// Rows deleted.
        /// </summary>
        [JsonPropertyName("deletedCount")]
        public long DeletedCount { get; set; } = 0;

        #endregion
    }
}
