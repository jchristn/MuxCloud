namespace Test.Shared
{
    using System.Collections.Generic;

    /// <summary>
    /// How the fake machine answers one relayed request.
    /// </summary>
    public class FakeResponse
    {
        #region Public-Members

        /// <summary>
        /// Status code.
        /// </summary>
        public int StatusCode { get; set; } = 200;

        /// <summary>
        /// Content type.
        /// </summary>
        public string ContentType { get; set; } = "application/json";

        /// <summary>
        /// Extra headers.
        /// </summary>
        public Dictionary<string, string> Headers { get; set; } = new Dictionary<string, string>();

        /// <summary>
        /// Body chunks, sent in order.
        /// </summary>
        public List<string> Chunks { get; set; } = new List<string>();

        /// <summary>
        /// Delay between chunks, in milliseconds.
        /// </summary>
        public int ChunkDelayMs { get; set; } = 0;

        /// <summary>
        /// Never answer (timeout tests).
        /// </summary>
        public bool NeverRespond { get; set; } = false;

        /// <summary>
        /// Answer with stream.error instead.
        /// </summary>
        public string? ErrorCode { get; set; } = null;

        #endregion
    }
}
