namespace MuxCloud.Server.Relay
{
    using System;
    using System.Collections.Generic;
    using System.Diagnostics;
    using System.Threading;
    using System.Threading.Tasks;
    using MuxCloud.Core;
    using MuxCloud.Core.Exceptions;
    using MuxCloud.Core.Models;
    using MuxCloud.Core.Services;
    using MuxCloud.Protocol;
    using MuxCloud.Server.Http;
    using MuxCloud.Server.Tunnel;
    using WatsonWebserver.Core;

    /// <summary>
    /// Relays /m/{machineId}/... HTTP requests through the machine's tunnel and streams the response back, flushing every
    /// chunk so server-sent events arrive as they are produced. Under the parity rule the response is passed through
    /// unchanged apart from hop-by-hop and machine-only headers.
    /// Thread safety: one instance serves every request concurrently.
    /// </summary>
    public class RelayHandler
    {
        #region Private-Members

        private readonly MuxCloudServer _Server;

        #endregion

        #region Constructors-and-Factories

        /// <summary>
        /// Instantiate.
        /// </summary>
        /// <param name="server">Server.</param>
        /// <exception cref="ArgumentNullException">server is null.</exception>
        public RelayHandler(MuxCloudServer server)
        {
            ArgumentNullException.ThrowIfNull(server);
            _Server = server;
        }

        #endregion

        #region Public-Methods

        /// <summary>
        /// Split a relay path into machine identifier and machine-local path.
        /// </summary>
        /// <param name="rawPath">Raw path, for example /m/mch_x/v1.0/api/sessions.</param>
        /// <param name="machineId">Machine identifier.</param>
        /// <param name="localPath">Machine-local path, at least "/".</param>
        /// <returns>True when the path is a relay path.</returns>
        public static bool TryParse(string? rawPath, out string machineId, out string localPath)
        {
            machineId = String.Empty;
            localPath = "/";
            if (rawPath == null || !rawPath.StartsWith(TunnelProtocol.MachinePathPrefix, StringComparison.Ordinal)) return false;
            string rest = rawPath.Substring(TunnelProtocol.MachinePathPrefix.Length);
            int slash = rest.IndexOf('/', StringComparison.Ordinal);
            string id = slash < 0 ? rest : rest.Substring(0, slash);
            if (id.Length == 0) return false;
            machineId = Uri.UnescapeDataString(id);
            localPath = slash < 0 ? "/" : rest.Substring(slash);
            return true;
        }

        /// <summary>
        /// Relay one request.
        /// </summary>
        /// <param name="ctx">HTTP context.</param>
        /// <param name="rc">Request context.</param>
        /// <param name="machineId">Machine identifier.</param>
        /// <param name="localPath">Machine-local path.</param>
        /// <returns>Task.</returns>
        /// <exception cref="ApiException">401, 402, 404, 413, 503.</exception>
        public async Task HandleAsync(HttpContextBase ctx, RequestContext rc, string machineId, string localPath)
        {
            rc.IsRelay = true;
            rc.SkipBodyCapture = true;
            rc.PathTemplate = "/m/{machineId}/*";
            AuthenticatedPrincipal principal = Api.RequireUser(rc);
            Machine machine = await _Server.Machines.ReadForUserAsync(principal.User, machineId, ctx.Token).ConfigureAwait(false);
            string feature = rc.AuthScheme == AuthSchemeEnum.Cookie ? Constants.FeatureWebAccess : Constants.FeatureMobileAccess;
            await _Server.Entitlements.RequireAsync(principal.User.AccountId, feature, ctx.Token).ConfigureAwait(false);
            MachineTunnel? tunnel = _Server.Registry.Get(machine.Id);
            if (tunnel == null || machine.RevokedUtc != null) throw new ApiException(503, "MachineOffline", machine.Name + " is offline.");
            long max = _Server.Settings.Tunnel.MaxRequestBodyBytes;
            if (ctx.Request.ContentLength > max) throw new ApiException(413, "BodyTooLarge", "Relayed request bodies are limited to " + max + " bytes.");
            byte[] body = ctx.Request.DataAsBytes ?? Array.Empty<byte>();
            if (body.Length > max) throw new ApiException(413, "BodyTooLarge", "Relayed request bodies are limited to " + max + " bytes.");
            RelayStream? stream = tunnel.TryOpenStream();
            if (stream == null) throw new ApiException(503, "TooManyStreams", machine.Name + " is handling the maximum number of concurrent requests. Try again.");

            Stopwatch watch = Stopwatch.StartNew();
            int status = 502;
            try
            {
                HttpRequestPayload request = BuildRequest(ctx, rc, localPath, body);
                if (!await tunnel.SendAsync(TunnelProtocol.CreateHttpRequest(stream.Id, request), ctx.Token).ConfigureAwait(false))
                {
                    throw new ApiException(503, "MachineOffline", machine.Name + " is offline.");
                }

                status = await PumpAsync(ctx, rc, tunnel, stream).ConfigureAwait(false);
            }
            finally
            {
                tunnel.RemoveStream(stream.Id);
                MuxCloudTelemetry.Relay(status, watch.Elapsed.TotalMilliseconds);
            }
        }

        #endregion

        #region Private-Methods

        private static HttpRequestPayload BuildRequest(HttpContextBase ctx, RequestContext rc, string localPath, byte[] body)
        {
            Dictionary<string, string> headers = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            foreach (string? key in ctx.Request.Headers.AllKeys)
            {
                if (String.IsNullOrEmpty(key)) continue;
                headers[key] = ctx.Request.Headers[key] ?? String.Empty;
            }

            string raw = ctx.Request.Url.RawWithQuery ?? String.Empty;
            int q = raw.IndexOf('?', StringComparison.Ordinal);
            return new HttpRequestPayload
            {
                Method = ctx.Request.Method.ToString(),
                Path = localPath,
                Query = q < 0 ? String.Empty : raw.Substring(q + 1),
                Headers = TunnelHeaders.Filter(headers, TunnelHeaders.CloudOnlyRequest),
                ContentType = ctx.Request.ContentType ?? String.Empty,
                BodyBase64 = body.Length == 0 ? String.Empty : Convert.ToBase64String(body),
                RequesterIp = rc.SourceIp
            };
        }

        private async Task<int> PumpAsync(HttpContextBase ctx, RequestContext rc, MachineTunnel tunnel, RelayStream stream)
        {
            bool started = false;
            int status = 502;
            using (CancellationTokenSource firstByte = CancellationTokenSource.CreateLinkedTokenSource(ctx.Token))
            {
                firstByte.CancelAfter(TimeSpan.FromSeconds(_Server.Settings.Tunnel.FirstByteTimeoutSeconds));
                try
                {
                    while (true)
                    {
                        CancellationToken waitToken = started ? ctx.Token : firstByte.Token;
                        if (!await stream.Frames.WaitToReadAsync(waitToken).ConfigureAwait(false)) break;
                        while (stream.Frames.TryRead(out TunnelEnvelope? frame))
                        {
                            switch (frame.Type)
                            {
                                case TunnelMessageTypes.HttpResponseStart:
                                    if (started || frame.HttpResponseStart == null) break;
                                    started = true;
                                    status = frame.HttpResponseStart.StatusCode;
                                    StartResponse(ctx, frame.HttpResponseStart);
                                    break;
                                case TunnelMessageTypes.HttpResponseChunk:
                                    if (!started || frame.HttpChunk == null) break;
                                    stream.Consumed(frame.HttpChunk.Data.Length);
                                    byte[] data = Convert.FromBase64String(frame.HttpChunk.Data);
                                    rc.ResponseBytes += data.Length;
                                    if (data.Length > 0 && !await ctx.Response.SendChunk(data, false, ctx.Token).ConfigureAwait(false))
                                    {
                                        await CancelAsync(tunnel, stream).ConfigureAwait(false);
                                        return status;
                                    }

                                    break;
                                case TunnelMessageTypes.HttpResponseEnd:
                                    if (!started)
                                    {
                                        await Api.SendErrorAsync(ctx, rc, 502, "LoopbackFailed", "The machine ended the response without starting it.").ConfigureAwait(false);
                                        return 502;
                                    }

                                    await ctx.Response.SendChunk(Array.Empty<byte>(), true, ctx.Token).ConfigureAwait(false);
                                    return status;
                                case TunnelMessageTypes.StreamError:
                                    if (!started)
                                    {
                                        TunnelErrorPayload error = frame.Error ?? new TunnelErrorPayload();
                                        await Api.SendErrorAsync(ctx, rc, error.StatusCode, ErrorCode(error.Code), error.Message).ConfigureAwait(false);
                                        return error.StatusCode;
                                    }

                                    await ctx.Response.SendChunk(Array.Empty<byte>(), true, ctx.Token).ConfigureAwait(false);
                                    return status;
                            }
                        }
                    }
                }
                catch (OperationCanceledException)
                {
                    await CancelAsync(tunnel, stream).ConfigureAwait(false);
                    if (!started && !ctx.Token.IsCancellationRequested)
                    {
                        await Api.SendErrorAsync(ctx, rc, 504, "Timeout", "The machine did not start responding within " + _Server.Settings.Tunnel.FirstByteTimeoutSeconds + " seconds.").ConfigureAwait(false);
                        return 504;
                    }

                    return status;
                }
                catch (Exception)
                {
                    await CancelAsync(tunnel, stream).ConfigureAwait(false);
                    return status;
                }
            }

            if (!started) await Api.SendErrorAsync(ctx, rc, 502, "LoopbackFailed", "The machine disconnected.").ConfigureAwait(false);
            else await ctx.Response.SendChunk(Array.Empty<byte>(), true, ctx.Token).ConfigureAwait(false);
            return status;
        }

        private static void StartResponse(HttpContextBase ctx, HttpResponseStartPayload start)
        {
            ctx.Response.StatusCode = start.StatusCode;
            Dictionary<string, string> headers = TunnelHeaders.Filter(start.Headers, TunnelHeaders.MachineOnlyResponse);
            foreach (KeyValuePair<string, string> header in headers)
            {
                if (String.Equals(header.Key, "Content-Type", StringComparison.OrdinalIgnoreCase)) continue;
                ctx.Response.Headers.Add(header.Key, header.Value);
            }

            string contentType = String.IsNullOrEmpty(start.ContentType) ? "application/octet-stream" : start.ContentType;
            ctx.Response.ContentType = contentType;
            if (contentType.StartsWith("text/html", StringComparison.OrdinalIgnoreCase))
            {
                ctx.Response.Headers.Add("Content-Security-Policy", "frame-ancestors 'self'");
                ctx.Response.Headers.Add("X-Frame-Options", "SAMEORIGIN");
            }

            if (contentType.StartsWith("text/event-stream", StringComparison.OrdinalIgnoreCase)) ctx.Response.Headers.Add("X-Accel-Buffering", "no");
            ctx.Response.ChunkedTransfer = true;
        }

        private static async Task CancelAsync(MachineTunnel tunnel, RelayStream stream)
        {
            await tunnel.SendAsync(TunnelProtocol.CreateHttpCancel(stream.Id)).ConfigureAwait(false);
        }

        private static string ErrorCode(string code)
        {
            switch (code)
            {
                case TunnelErrorCodes.BadRequest: return "BadRequest";
                case TunnelErrorCodes.BodyTooLarge: return "BodyTooLarge";
                case TunnelErrorCodes.Timeout: return "Timeout";
                case TunnelErrorCodes.PolicyDenied: return "Forbidden";
                case TunnelErrorCodes.TooManyStreams: return "TooManyStreams";
                case TunnelErrorCodes.MachineOffline: return "MachineOffline";
                default: return "LoopbackFailed";
            }
        }

        #endregion
    }
}
