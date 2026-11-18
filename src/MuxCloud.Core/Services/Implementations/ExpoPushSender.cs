namespace MuxCloud.Core.Services.Implementations
{
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Net.Http;
    using System.Net.Http.Headers;
    using System.Text;
    using System.Text.Json;
    using System.Threading;
    using System.Threading.Tasks;
    using MuxCloud.Core.Models;
    using MuxCloud.Core.Services.Implementations.Expo;
    using MuxCloud.Core.Services.Interfaces;
    using MuxCloud.Core.Settings;

    /// <summary>
    /// Sends push notifications through the Expo push service, 100 messages per request. A failed HTTP call marks every
    /// message in that batch as failed; it never throws.
    /// Thread safety: safe to call concurrently.
    /// </summary>
    public class ExpoPushSender : IPushSender, IDisposable
    {
        #region Private-Members

        private const int _BatchSize = 100;
        private readonly PushSettings _Settings;
        private readonly HttpClient _Http;
        private bool _Disposed = false;

        #endregion

        #region Constructors-and-Factories

        /// <summary>
        /// Instantiate.
        /// </summary>
        /// <param name="settings">Push settings.</param>
        /// <exception cref="ArgumentNullException">settings is null.</exception>
        public ExpoPushSender(PushSettings settings)
        {
            ArgumentNullException.ThrowIfNull(settings);
            _Settings = settings;
            _Http = new HttpClient { Timeout = TimeSpan.FromSeconds(15) };
        }

        #endregion

        #region Public-Methods

        /// <inheritdoc />
        public async Task<List<PushResult>> SendAsync(IReadOnlyList<PushMessage> messages, CancellationToken token = default)
        {
            ArgumentNullException.ThrowIfNull(messages);
            List<PushResult> results = new List<PushResult>();
            for (int i = 0; i < messages.Count; i += _BatchSize)
            {
                List<PushMessage> batch = messages.Skip(i).Take(_BatchSize).ToList();
                results.AddRange(await SendBatchAsync(batch, token).ConfigureAwait(false));
            }

            return results;
        }

        /// <summary>
        /// Release the HTTP client.
        /// </summary>
        public void Dispose()
        {
            Dispose(true);
            GC.SuppressFinalize(this);
        }

        #endregion

        #region Private-Methods

        /// <summary>
        /// Release resources.
        /// </summary>
        /// <param name="disposing">Whether managed resources are released.</param>
        protected virtual void Dispose(bool disposing)
        {
            if (_Disposed) return;
            if (disposing) _Http.Dispose();
            _Disposed = true;
        }

        private async Task<List<PushResult>> SendBatchAsync(List<PushMessage> batch, CancellationToken token)
        {
            List<ExpoPushRequestMessage> body = batch.Select(m => new ExpoPushRequestMessage { To = m.To, Title = m.Title, Body = m.Body, Data = m.Data }).ToList();
            using (HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Post, _Settings.ExpoUrl))
            {
                request.Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");
                request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
                if (!String.IsNullOrWhiteSpace(_Settings.ExpoAccessToken)) request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _Settings.ExpoAccessToken);
                try
                {
                    using (HttpResponseMessage response = await _Http.SendAsync(request, token).ConfigureAwait(false))
                    {
                        string text = await response.Content.ReadAsStringAsync(token).ConfigureAwait(false);
                        if (!response.IsSuccessStatusCode) return Failed(batch, "HttpError", "Expo returned " + (int)response.StatusCode + ".");
                        ExpoPushResponse? parsed = JsonSerializer.Deserialize<ExpoPushResponse>(text);
                        List<ExpoPushTicket> tickets = parsed?.Data ?? new List<ExpoPushTicket>();
                        List<PushResult> results = new List<PushResult>();
                        for (int i = 0; i < batch.Count; i++)
                        {
                            ExpoPushTicket? ticket = i < tickets.Count ? tickets[i] : null;
                            bool ok = ticket != null && String.Equals(ticket.Status, "ok", StringComparison.OrdinalIgnoreCase);
                            results.Add(new PushResult { To = batch[i].To, Ok = ok, ErrorCode = ok ? String.Empty : ticket?.Details?.Error ?? "Unknown", Message = ticket?.Message ?? String.Empty });
                        }

                        return results;
                    }
                }
                catch (OperationCanceledException) when (token.IsCancellationRequested)
                {
                    throw;
                }
                catch (Exception e) when (e is HttpRequestException || e is JsonException || e is OperationCanceledException)
                {
                    return Failed(batch, "HttpError", e.Message);
                }
            }
        }

        private static List<PushResult> Failed(List<PushMessage> batch, string code, string message)
        {
            return batch.Select(m => new PushResult { To = m.To, Ok = false, ErrorCode = code, Message = message }).ToList();
        }

        #endregion
    }
}
