namespace Test.Shared
{
    using System;
    using System.Collections.Concurrent;
    using System.Collections.Generic;
    using System.Linq;
    using System.Threading;
    using System.Threading.Tasks;
    using MuxCloud.Core.Models;
    using MuxCloud.Core.Services.Interfaces;

    /// <summary>
    /// Records push messages instead of sending them. Tokens listed in <see cref="Unregistered"/> come back as
    /// DeviceNotRegistered, like Expo does for uninstalled apps.
    /// </summary>
    public class FakePushSender : IPushSender
    {
        #region Public-Members

        /// <summary>
        /// Messages sent.
        /// </summary>
        public ConcurrentQueue<PushMessage> Sent { get; } = new ConcurrentQueue<PushMessage>();

        /// <summary>
        /// Tokens to report as DeviceNotRegistered.
        /// </summary>
        public HashSet<string> Unregistered { get; } = new HashSet<string>(StringComparer.Ordinal);

        #endregion

        #region Public-Methods

        /// <inheritdoc />
        public Task<List<PushResult>> SendAsync(IReadOnlyList<PushMessage> messages, CancellationToken token = default)
        {
            List<PushResult> results = new List<PushResult>();
            foreach (PushMessage message in messages)
            {
                Sent.Enqueue(message);
                bool gone = Unregistered.Contains(message.To);
                results.Add(new PushResult { To = message.To, Ok = !gone, ErrorCode = gone ? "DeviceNotRegistered" : String.Empty });
            }

            return Task.FromResult(results);
        }

        #endregion
    }
}
