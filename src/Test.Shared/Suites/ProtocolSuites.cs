namespace Test.Shared.Suites
{
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using MuxCloud.Protocol;
    using Touchstone.Core;

    /// <summary>
    /// Tunnel protocol contracts: envelope round trips, handshake proofs, and reconnect and close-code policy.
    /// </summary>
    public static class ProtocolSuites
    {
        #region Public-Methods

        /// <summary>
        /// Envelope serialization suite.
        /// </summary>
        /// <returns>Suite.</returns>
        public static TestSuiteDescriptor Envelope()
        {
            const string suite = "ProtocolEnvelope";
            return new TestSuiteDescriptor(suite, "Tunnel envelope", new List<TestCaseDescriptor>
            {
                Cases.Sync(suite, "HelloRoundTrip", "A hello envelope survives a round trip with camelCase names and no null payloads", () =>
                {
                    TunnelHelloPayload hello = new TunnelHelloPayload { MachineId = "mch_1", MuxVersion = "2.0.0", MachineName = "laptop", Capabilities = new List<string>(TunnelCapabilities.All), TimestampUtc = "t", Nonce = "n", Proof = "p" };
                    string json = TunnelProtocol.Serialize(TunnelProtocol.CreateHello(hello));
                    TestAssert.True(json.Contains("\"type\":\"tunnel.hello\"", StringComparison.Ordinal), "type is camelCase: " + json);
                    TestAssert.True(json.Contains("\"machineId\":\"mch_1\"", StringComparison.Ordinal), "machineId is camelCase: " + json);
                    TestAssert.True(!json.Contains("\"welcome\"", StringComparison.Ordinal) && !json.Contains("null", StringComparison.Ordinal), "null payloads are omitted: " + json);
                    TunnelEnvelope back = TunnelProtocol.Deserialize(json);
                    TestAssert.Equal(TunnelMessageTypes.Hello, back.Type, "type");
                    TestAssert.Equal("laptop", back.Hello!.MachineName, "machine name");
                    TestAssert.Equal(TunnelCapabilities.All.Count, back.Hello.Capabilities.Count, "capabilities");
                }),
                Cases.Sync(suite, "HttpRoundTrip", "Request, response start, chunk, and end envelopes carry the stream id and bytes", () =>
                {
                    HttpRequestPayload request = new HttpRequestPayload { Method = "post", Path = "/v1.0/api/chat/stream", Query = "?a=1", BodyBase64 = Convert.ToBase64String(new byte[] { 1, 2, 3 }) };
                    request.Headers["Content-Type"] = "application/json";
                    TunnelEnvelope parsed = TunnelProtocol.Deserialize(TunnelProtocol.Serialize(TunnelProtocol.CreateHttpRequest("str_1", request)));
                    TestAssert.Equal("str_1", parsed.Id, "stream id");
                    TestAssert.Equal("POST", parsed.HttpRequest!.Method, "method is upper case");
                    TestAssert.Equal("a=1", parsed.HttpRequest.Query, "query loses its question mark");
                    TestAssert.Equal("application/json", parsed.HttpRequest.Headers["Content-Type"], "header");
                    byte[] data = new byte[] { 10, 20, 30, 40, 50 };
                    TunnelEnvelope chunk = TunnelProtocol.Deserialize(TunnelProtocol.Serialize(TunnelProtocol.CreateHttpChunk("str_1", data, 1, 3)));
                    TestAssert.True(Convert.FromBase64String(chunk.HttpChunk!.Data).SequenceEqual(new byte[] { 20, 30, 40 }), "chunk slice");
                    TunnelEnvelope end = TunnelProtocol.Deserialize(TunnelProtocol.Serialize(TunnelProtocol.CreateHttpResponseEnd("str_1")));
                    TestAssert.Equal(TunnelMessageTypes.HttpResponseEnd, end.Type, "end type");
                    TestAssert.True(end.HttpChunk == null && end.HttpRequest == null, "end has no payload");
                }),
                Cases.Sync(suite, "WsRoundTrip", "WebSocket channel envelopes round trip", () =>
                {
                    TunnelEnvelope open = TunnelProtocol.Deserialize(TunnelProtocol.Serialize(TunnelProtocol.CreateWsOpen("chn_1", new WsOpenPayload { Path = "/v1.0/ws", Subprotocols = new List<string> { "mux" } })));
                    TestAssert.Equal("/v1.0/ws", open.WsOpen!.Path, "path");
                    TunnelEnvelope frame = TunnelProtocol.Deserialize(TunnelProtocol.Serialize(TunnelProtocol.CreateWsFrame("chn_1", "{\"action\":\"subscribe\"}")));
                    TestAssert.Equal("{\"action\":\"subscribe\"}", frame.WsFrame!.Text, "text survives escaping");
                    TunnelEnvelope close = TunnelProtocol.Deserialize(TunnelProtocol.Serialize(TunnelProtocol.CreateWsClose("chn_1", 1, "bye")));
                    TestAssert.Equal(1000, close.WsClose!.Code, "close code clamps to 1000");
                }),
                Cases.Sync(suite, "PingPong", "A pong echoes the ping nonce", () =>
                {
                    TunnelEnvelope ping = TunnelProtocol.CreatePing();
                    TunnelEnvelope pong = TunnelProtocol.CreatePong(ping);
                    TestAssert.Equal(ping.Ping!.Nonce, pong.Ping!.Nonce, "nonce");
                    TestAssert.Equal(32, ping.Ping.Nonce.Length, "nonce length");
                }),
                Cases.Sync(suite, "BadFrames", "Empty, non-JSON, and typeless frames are rejected with a protocol exception", () =>
                {
                    TestAssert.Throws<TunnelProtocolException>(() => TunnelProtocol.Deserialize(""), "empty");
                    TestAssert.Throws<TunnelProtocolException>(() => TunnelProtocol.Deserialize("not json"), "not json");
                    TestAssert.Throws<TunnelProtocolException>(() => TunnelProtocol.Deserialize("{\"id\":\"x\"}"), "no type");
                }),
                Cases.Sync(suite, "UnknownFieldsIgnored", "Unknown fields and types parse for forward compatibility", () =>
                {
                    TunnelEnvelope e = TunnelProtocol.Deserialize("{\"type\":\"future.thing\",\"id\":\"x\",\"somethingNew\":{\"a\":1}}");
                    TestAssert.Equal("future.thing", e.Type, "type");
                    TestAssert.True(!TunnelMessageTypes.IsKnown(e.Type), "future type is unknown");
                    TestAssert.True(TunnelMessageTypes.IsKnown(TunnelMessageTypes.WsFrame), "known type");
                }),
                Cases.Sync(suite, "TunnelUri", "Server URLs map to tunnel and HTTP URIs", () =>
                {
                    TestAssert.Equal("wss://app.usemux.ai/v1.0/tunnel", TunnelProtocol.ToTunnelUri(null).ToString(), "default");
                    TestAssert.Equal("ws://127.0.0.1:8800/v1.0/tunnel", TunnelProtocol.ToTunnelUri("http://127.0.0.1:8800").ToString(), "http becomes ws");
                    TestAssert.Equal("wss://example.test/custom", TunnelProtocol.ToTunnelUri("https://example.test/custom/").ToString(), "explicit path kept");
                    TestAssert.Equal("https://app.usemux.ai/v1.0/api/machines/enroll", TunnelProtocol.ToHttpUri("wss://app.usemux.ai", TunnelProtocol.EnrollPath).ToString(), "enroll URI");
                    TestAssert.Throws<ArgumentException>(() => TunnelProtocol.ToTunnelUri("ftp://x"), "ftp rejected");
                    TestAssert.Throws<ArgumentException>(() => TunnelProtocol.ToTunnelUri("not a url"), "relative rejected");
                }),
                Cases.Sync(suite, "Capabilities", "Capability intersection keeps only shared names in canonical order", () =>
                {
                    List<string> both = TunnelProtocol.IntersectCapabilities(new[] { TunnelCapabilities.WsRelay, TunnelCapabilities.HttpRelay, "x.future" }, TunnelCapabilities.All);
                    TestAssert.Equal(TunnelCapabilities.HttpRelay + "," + TunnelCapabilities.WsRelay, String.Join(",", both), "intersection");
                }),
                Cases.Sync(suite, "HeaderFilter", "Hop-by-hop and cloud-only headers are dropped", () =>
                {
                    Dictionary<string, string> source = new Dictionary<string, string> { { "Cookie", "a" }, { "Connection", "keep-alive" }, { "Accept", "text/event-stream" }, { "authorization", "Bearer x" } };
                    Dictionary<string, string> kept = TunnelHeaders.Filter(source, TunnelHeaders.CloudOnlyRequest);
                    TestAssert.Equal(1, kept.Count, "kept count");
                    TestAssert.Equal("text/event-stream", kept["accept"], "case-insensitive accept");
                })
            });
        }

        /// <summary>
        /// Handshake proof suite.
        /// </summary>
        /// <returns>Suite.</returns>
        public static TestSuiteDescriptor Proof()
        {
            const string suite = "ProtocolProof";
            return new TestSuiteDescriptor(suite, "Handshake proof", new List<TestCaseDescriptor>
            {
                Cases.Sync(suite, "SecretShape", "Machine secrets have the prefix, length, and alphabet", () =>
                {
                    string secret = TunnelProof.CreateMachineSecret();
                    TestAssert.True(secret.StartsWith(TunnelProof.MachineSecretPrefix, StringComparison.Ordinal), "prefix");
                    TestAssert.Equal(TunnelProof.MachineSecretPrefix.Length + TunnelProof.MachineSecretRandomLength, secret.Length, "length");
                    TestAssert.True(secret.Substring(4).All(Char.IsAsciiLetterOrDigit), "alphanumeric");
                    TestAssert.True(secret != TunnelProof.CreateMachineSecret(), "random");
                    TestAssert.Equal(secret.Substring(secret.Length - 4), TunnelProof.Last4(secret), "last four");
                }),
                Cases.Sync(suite, "VerifyGood", "A proof computed with the secret verifies", () =>
                {
                    string secret = TunnelProof.CreateMachineSecret();
                    string ts = TunnelProof.FormatTimestamp(DateTime.UtcNow);
                    string nonce = TunnelProof.CreateNonce();
                    string proof = TunnelProof.ComputeProof(secret, "mch_1", ts, nonce);
                    TestAssert.Equal(64, proof.Length, "hex length");
                    TestAssert.True(TunnelProof.VerifyProof(secret, "mch_1", ts, nonce, proof), "verifies");
                    TestAssert.True(TunnelProof.VerifyProof(secret, "mch_1", ts, nonce, proof.ToUpperInvariant()), "case-insensitive hex");
                }),
                Cases.Sync(suite, "VerifyBad", "Changing any input breaks the proof", () =>
                {
                    string secret = TunnelProof.CreateMachineSecret();
                    string ts = TunnelProof.FormatTimestamp(DateTime.UtcNow);
                    string nonce = TunnelProof.CreateNonce();
                    string proof = TunnelProof.ComputeProof(secret, "mch_1", ts, nonce);
                    TestAssert.True(!TunnelProof.VerifyProof(TunnelProof.CreateMachineSecret(), "mch_1", ts, nonce, proof), "other secret");
                    TestAssert.True(!TunnelProof.VerifyProof(secret, "mch_2", ts, nonce, proof), "other machine");
                    TestAssert.True(!TunnelProof.VerifyProof(secret, "mch_1", ts, TunnelProof.CreateNonce(), proof), "other nonce");
                    TestAssert.True(!TunnelProof.VerifyProof(secret, "mch_1", ts, nonce, ""), "empty proof");
                    TestAssert.True(!TunnelProof.VerifyProof(secret, "mch_1", ts, nonce, "zz"), "short proof");
                }),
                Cases.Sync(suite, "Freshness", "Timestamps outside the skew window are stale", () =>
                {
                    DateTime now = DateTime.UtcNow;
                    TestAssert.True(TunnelProof.IsTimestampFresh(TunnelProof.FormatTimestamp(now.AddSeconds(-60)), now), "60 seconds old is fresh");
                    TestAssert.True(!TunnelProof.IsTimestampFresh(TunnelProof.FormatTimestamp(now.AddSeconds(-300)), now), "5 minutes old is stale");
                    TestAssert.True(!TunnelProof.IsTimestampFresh(TunnelProof.FormatTimestamp(now.AddSeconds(300)), now), "5 minutes ahead is stale");
                    TestAssert.True(!TunnelProof.IsTimestampFresh("garbage", now), "garbage is stale");
                })
            });
        }

        /// <summary>
        /// Reconnect and close-code policy suite.
        /// </summary>
        /// <returns>Suite.</returns>
        public static TestSuiteDescriptor Policy()
        {
            const string suite = "ProtocolPolicy";
            return new TestSuiteDescriptor(suite, "Reconnect and close policy", new List<TestCaseDescriptor>
            {
                Cases.Sync(suite, "BackoffGrowsAndCaps", "Backoff doubles from the base and stops at the maximum, within jitter", () =>
                {
                    TunnelReconnectPolicy policy = new TunnelReconnectPolicy { BaseDelaySeconds = 2, MaxDelaySeconds = 60, Jitter = 0.2 };
                    Random random = new Random(7);
                    for (int attempt = 1; attempt <= 12; attempt++)
                    {
                        double expected = Math.Min(60, 2 * Math.Pow(2, attempt - 1));
                        double actual = policy.ComputeDelay(attempt, random).TotalSeconds;
                        TestAssert.True(actual >= expected * 0.8 - 0.001 && actual <= expected * 1.2 + 0.001, "attempt " + attempt + ": " + actual + " not within 20% of " + expected);
                    }
                }),
                Cases.Sync(suite, "TerminalCodes", "Only credential, revocation, and version failures stop reconnecting", () =>
                {
                    TestAssert.True(TunnelCloseCodes.IsTerminal(TunnelCloseCodes.Unauthorized), "unauthorized");
                    TestAssert.True(TunnelCloseCodes.IsTerminal(TunnelCloseCodes.Revoked), "revoked");
                    TestAssert.True(TunnelCloseCodes.IsTerminal(TunnelCloseCodes.UnsupportedVersion), "version");
                    TestAssert.True(!TunnelCloseCodes.IsTerminal(TunnelCloseCodes.Draining), "draining retries");
                    TestAssert.True(!TunnelCloseCodes.IsTerminal(TunnelCloseCodes.HeartbeatTimeout), "heartbeat retries");
                    TestAssert.True(!TunnelCloseCodes.IsTerminal(1006), "abnormal closure retries");
                }),
                Cases.Sync(suite, "WelcomeClamps", "Welcome values clamp to their documented ranges", () =>
                {
                    TunnelWelcomePayload welcome = new TunnelWelcomePayload { HeartbeatSeconds = 1, MaxConcurrentStreams = 0, MaxRequestBodyBytes = -5 };
                    TestAssert.Equal(5, welcome.HeartbeatSeconds, "heartbeat minimum");
                    TestAssert.Equal(1, welcome.MaxConcurrentStreams, "stream minimum");
                    TestAssert.Equal(0L, welcome.MaxRequestBodyBytes, "body minimum");
                })
            });
        }

        #endregion
    }
}
