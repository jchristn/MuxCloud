namespace MuxCloud.Server.Events
{
    using System;
    using System.Collections.Concurrent;
    using System.Collections.Generic;
    using System.Linq;
    using System.Net.WebSockets;
    using System.Threading;
    using System.Threading.Tasks;
    using MuxCloud.Server.Http;

    /// <summary>
    /// Fans account events out to each user's connected events sockets.
    /// Thread safety: safe to call concurrently.
    /// </summary>
    public class EventHub
    {
        #region Public-Members

        /// <summary>
        /// Connected subscribers.
        /// </summary>
        public int Count
        {
            get { return _Subscribers.Count; }
        }

        #endregion

        #region Private-Members

        private readonly ConcurrentDictionary<Guid, EventSubscriber> _Subscribers = new ConcurrentDictionary<Guid, EventSubscriber>();

        #endregion

        #region Public-Methods

        /// <summary>
        /// Add a subscriber.
        /// </summary>
        /// <param name="subscriber">Subscriber.</param>
        public void Add(EventSubscriber subscriber)
        {
            ArgumentNullException.ThrowIfNull(subscriber);
            _Subscribers[subscriber.Id] = subscriber;
        }

        /// <summary>
        /// Remove a subscriber.
        /// </summary>
        /// <param name="subscriber">Subscriber.</param>
        public void Remove(EventSubscriber subscriber)
        {
            ArgumentNullException.ThrowIfNull(subscriber);
            _Subscribers.TryRemove(subscriber.Id, out _);
            subscriber.Complete();
        }

        /// <summary>
        /// Send an event to every socket of a user.
        /// </summary>
        /// <param name="userId">User.</param>
        /// <param name="message">Event.</param>
        public void Publish(string userId, EventMessage message)
        {
            ArgumentNullException.ThrowIfNull(message);
            string json = ServerJson.Serialize(message);
            foreach (EventSubscriber subscriber in _Subscribers.Values.Where(s => s.UserId == userId)) subscriber.Enqueue(json);
        }

        /// <summary>
        /// Close every socket of a user (user disabled or deleted).
        /// </summary>
        /// <param name="userId">User.</param>
        /// <returns>Task.</returns>
        public async Task DisconnectUserAsync(string userId)
        {
            List<EventSubscriber> subscribers = _Subscribers.Values.Where(s => s.UserId == userId).ToList();
            foreach (EventSubscriber subscriber in subscribers)
            {
                Remove(subscriber);
                try
                {
                    await subscriber.Session.CloseAsync((WebSocketCloseStatus)4401, "signed out", CancellationToken.None).ConfigureAwait(false);
                }
                catch (Exception)
                {
                    // Already closed.
                }
            }
        }

        #endregion
    }
}
