namespace MuxCloud.Core.Enums
{
    /// <summary>
    /// Email delivery provider.
    /// </summary>
    public enum EmailProviderEnum
    {
        /// <summary>
        /// Email is not sent.
        /// </summary>
        Disabled = 0,

        /// <summary>
        /// Rendered messages are written to a folder (development and tests).
        /// </summary>
        File = 1,

        /// <summary>
        /// Messages are sent through Mailgun.
        /// </summary>
        Mailgun = 2
    }
}
