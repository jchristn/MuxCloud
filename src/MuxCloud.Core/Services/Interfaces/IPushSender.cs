namespace MuxCloud.Core.Services.Interfaces
{
    using System.Collections.Generic;
    using System.Threading;
    using System.Threading.Tasks;
    using MuxCloud.Core.Models;

    /// <summary>
    /// Push delivery boundary (Expo in production, a fake in tests).
    /// </summary>
    public interface IPushSender
    {
        /// <summary>
        /// Send messages.
        /// </summary>
        /// <param name="messages">Messages, one per device.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>One result per message, in order.</returns>
        Task<List<PushResult>> SendAsync(IReadOnlyList<PushMessage> messages, CancellationToken token = default);
    }
}
