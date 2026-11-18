namespace MuxCloud.Server.Http
{
    /// <summary>
    /// How a request authenticated.
    /// </summary>
    public enum AuthSchemeEnum
    {
        /// <summary>
        /// Not authenticated.
        /// </summary>
        None = 0,

        /// <summary>
        /// Session cookie (browser).
        /// </summary>
        Cookie = 1,

        /// <summary>
        /// Bearer access token (mobile, scripts).
        /// </summary>
        Bearer = 2,

        /// <summary>
        /// Single-use WebSocket ticket.
        /// </summary>
        Ticket = 3
    }
}
