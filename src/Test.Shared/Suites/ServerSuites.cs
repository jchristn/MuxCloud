namespace Test.Shared.Suites
{
    using System;
    using System.Collections.Generic;
    using System.Diagnostics;
    using System.IO;
    using System.Linq;
    using System.Net;
    using System.Net.Http;
    using System.Text;
    using System.Threading;
    using System.Threading.Tasks;
    using MuxCloud.Core.Models;
    using MuxCloud.Core.Requests;
    using MuxCloud.Core.Responses;
    using MuxCloud.Protocol;
    using Touchstone.Core;

    /// <summary>
    /// End-to-end suites against a real server: HTTP auth flows, enrollment, the tunnel handshake and lifecycle, the relay
    /// (REST, SSE, WebSocket), cancellation, isolation, and account events.
    /// </summary>
    public static class ServerSuites
    {
        #region Private-Members

        private static readonly TimeSpan _Wait = TimeSpan.FromSeconds(10);

        #endregion

        #region Public-Methods

        /// <summary>
        /// HTTP API suite.
        /// </summary>
        /// <returns>Suite.</returns>
        public static TestSuiteDescriptor Http()
        {
            const string suite = "HttpApi";
            return new TestSuiteDescriptor(suite, "HTTP API", new List<TestCaseDescriptor>
            {
                Cases.Async(suite, "BrowserAuthFlow", "Signup, emailed verification, cookie login, Origin enforcement, and logout", async (CancellationToken token) =>
                {
                    await using (ServerFixture f = await ServerFixture.StartAsync(token).ConfigureAwait(false))
                    {
                        await f.CreateVerifiedUserAsync("ada@example.com", "correct horse battery", token).ConfigureAwait(false);
                        using (HttpClient browser = f.BrowserClient())
                        {
                            HttpResponseMessage login = await browser.PostAsync("/v1.0/api/auth/login", ServerFixture.Json(new LoginRequest { Email = "ada@example.com", Password = "correct horse battery" }), token).ConfigureAwait(false);
                            TestAssert.Equal(HttpStatusCode.OK, login.StatusCode, "login");
                            LoginResponse body = await ServerFixture.ReadAsync<LoginResponse>(login, token).ConfigureAwait(false);
                            TestAssert.True(body.AccessToken == null && body.RefreshToken == null, "web login keeps tokens out of the body");
                            List<string> cookies = login.Headers.GetValues("Set-Cookie").ToList();
                            TestAssert.True(cookies.Any(c => c.StartsWith("muxcloud_session=", StringComparison.Ordinal) && c.Contains("HttpOnly", StringComparison.Ordinal) && c.Contains("SameSite=Strict", StringComparison.Ordinal)), "session cookie");
                            TestAssert.True(cookies.Any(c => c.StartsWith("muxcloud_refresh=", StringComparison.Ordinal) && c.Contains("Path=/v1.0/api/auth", StringComparison.Ordinal)), "refresh cookie");
                            HttpResponseMessage me = await browser.GetAsync("/v1.0/api/auth/me", token).ConfigureAwait(false);
                            TestAssert.Equal(HttpStatusCode.OK, me.StatusCode, "me");
                            MeResponse who = await ServerFixture.ReadAsync<MeResponse>(me, token).ConfigureAwait(false);
                            TestAssert.Equal("ada@example.com", who.User.Email, "me email");
                            TestAssert.True(who.Entitlements.Features.Count >= 4, "entitlements");

                            HttpRequestMessage noOrigin = new HttpRequestMessage(HttpMethod.Put, "/v1.0/api/account") { Content = ServerFixture.Json(new UpdateProfileRequest { FirstName = "Ada" }) };
                            noOrigin.Headers.Remove("Origin");
                            noOrigin.Headers.Add("Origin", "https://evil.example");
                            HttpResponseMessage blocked = await browser.SendAsync(noOrigin, token).ConfigureAwait(false);
                            TestAssert.Equal(HttpStatusCode.Forbidden, blocked.StatusCode, "foreign origin blocked");
                            HttpResponseMessage updated = await browser.PutAsync("/v1.0/api/account", ServerFixture.Json(new UpdateProfileRequest { FirstName = "Ada" }), token).ConfigureAwait(false);
                            TestAssert.Equal(HttpStatusCode.OK, updated.StatusCode, "same origin allowed");

                            HttpResponseMessage refresh = await browser.PostAsync("/v1.0/api/auth/refresh", ServerFixture.Json(new RefreshRequest()), token).ConfigureAwait(false);
                            TestAssert.Equal(HttpStatusCode.OK, refresh.StatusCode, "cookie refresh");
                            HttpResponseMessage logout = await browser.PostAsync("/v1.0/api/auth/logout", null, token).ConfigureAwait(false);
                            TestAssert.Equal(HttpStatusCode.NoContent, logout.StatusCode, "logout");
                            TestAssert.Equal(HttpStatusCode.Unauthorized, (await browser.GetAsync("/v1.0/api/auth/me", token).ConfigureAwait(false)).StatusCode, "signed out");
                        }
                    }
                }),
                Cases.Async(suite, "MobileTokens", "Mobile login returns tokens, bearer works, refresh rotates, and tickets need bearer", async (CancellationToken token) =>
                {
                    await using (ServerFixture f = await ServerFixture.StartAsync(token).ConfigureAwait(false))
                    {
                        LoginResponse login = await f.MobileLoginAsync(TestSettings.AdminEmail, TestSettings.AdminPassword, token).ConfigureAwait(false);
                        TestAssert.True(login.AccessToken != null && login.RefreshToken != null, "tokens in body");
                        using (HttpClient mobile = f.BearerClient(login.AccessToken))
                        {
                            TestAssert.Equal(HttpStatusCode.OK, (await mobile.GetAsync("/v1.0/api/account", token).ConfigureAwait(false)).StatusCode, "bearer works");
                            HttpResponseMessage ticket = await mobile.PostAsync("/v1.0/api/ws-tickets", null, token).ConfigureAwait(false);
                            TestAssert.Equal(HttpStatusCode.Created, ticket.StatusCode, "ticket");
                            TestAssert.True((await ServerFixture.ReadAsync<WsTicketResponse>(ticket, token).ConfigureAwait(false)).Ticket.StartsWith("wst_", StringComparison.Ordinal), "ticket prefix");
                            HttpResponseMessage rotated = await mobile.PostAsync("/v1.0/api/auth/refresh", ServerFixture.Json(new RefreshRequest { RefreshToken = login.RefreshToken }), token).ConfigureAwait(false);
                            LoginResponse next = await ServerFixture.ReadAsync<LoginResponse>(rotated, token).ConfigureAwait(false);
                            TestAssert.True(next.RefreshToken != null && next.RefreshToken != login.RefreshToken, "rotated");
                            HttpResponseMessage sessions = await mobile.GetAsync("/v1.0/api/account/sessions", token).ConfigureAwait(false);
                            TestAssert.Equal(HttpStatusCode.OK, sessions.StatusCode, "sessions");
                        }

                        using (HttpClient anonymous = f.BearerClient("mca_bogus"))
                        {
                            TestAssert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync("/v1.0/api/account", token).ConfigureAwait(false)).StatusCode, "bad bearer");
                        }
                    }
                }),
                Cases.Async(suite, "PasswordResetHttp", "Forgot and reset over HTTP through the File email provider", async (CancellationToken token) =>
                {
                    await using (ServerFixture f = await ServerFixture.StartAsync(token).ConfigureAwait(false))
                    {
                        using (HttpClient client = f.BearerClient(null))
                        {
                            HttpResponseMessage forgot = await client.PostAsync("/v1.0/api/auth/password/forgot", ServerFixture.Json(new EmailRequest { Email = TestSettings.AdminEmail }), token).ConfigureAwait(false);
                            TestAssert.Equal(HttpStatusCode.Accepted, forgot.StatusCode, "forgot");
                            string reset = f.LatestTokenFor(TestSettings.AdminEmail, "pwr_");
                            HttpResponseMessage done = await client.PostAsync("/v1.0/api/auth/password/reset", ServerFixture.Json(new ResetPasswordRequest { Token = reset, Password = "a brand new password" }), token).ConfigureAwait(false);
                            TestAssert.Equal(HttpStatusCode.OK, done.StatusCode, "reset");
                        }

                        await f.MobileLoginAsync(TestSettings.AdminEmail, "a brand new password", token).ConfigureAwait(false);
                    }
                }),
                Cases.Async(suite, "AdminAndHistory", "Admin routes need an admin, and request history never stores credential bodies", async (CancellationToken token) =>
                {
                    await using (ServerFixture f = await ServerFixture.StartAsync(token).ConfigureAwait(false))
                    {
                        await f.CreateVerifiedUserAsync("bob@example.com", "bob password 123", token).ConfigureAwait(false);
                        LoginResponse bob = await f.MobileLoginAsync("bob@example.com", "bob password 123", token).ConfigureAwait(false);
                        LoginResponse admin = await f.MobileLoginAsync(TestSettings.AdminEmail, TestSettings.AdminPassword, token).ConfigureAwait(false);
                        using (HttpClient b = f.BearerClient(bob.AccessToken))
                        using (HttpClient a = f.BearerClient(admin.AccessToken))
                        {
                            TestAssert.Equal(HttpStatusCode.Forbidden, (await b.GetAsync("/v1.0/api/admin/stats", token).ConfigureAwait(false)).StatusCode, "non-admin refused");
                            TestAssert.Equal(HttpStatusCode.OK, (await a.GetAsync("/v1.0/api/admin/stats", token).ConfigureAwait(false)).StatusCode, "admin allowed");
                            HttpResponseMessage settings = await a.GetAsync("/v1.0/api/admin/settings", token).ConfigureAwait(false);
                            string settingsBody = await settings.Content.ReadAsStringAsync(token).ConfigureAwait(false);
                            TestAssert.True(!settingsBody.Contains(f.Settings.Auth.SigningKey, StringComparison.Ordinal) && settingsBody.Contains("(set)", StringComparison.Ordinal), "secrets masked");
                            await Task.Delay(300, token).ConfigureAwait(false);
                            HttpResponseMessage list = await a.GetAsync("/v1.0/api/request-history?pathContains=auth/login&pageSize=50", token).ConfigureAwait(false);
                            PagedResult<RequestHistoryEntry> page = await ServerFixture.ReadAsync<PagedResult<RequestHistoryEntry>>(list, token).ConfigureAwait(false);
                            TestAssert.True(page.TotalCount >= 2, "logins captured");
                            RequestHistoryEntry detail = await ServerFixture.ReadAsync<RequestHistoryEntry>(await a.GetAsync("/v1.0/api/request-history/" + page.Items[0].Id, token).ConfigureAwait(false), token).ConfigureAwait(false);
                            TestAssert.True(detail.RequestBody.Length == 0 && !detail.RequestHeaders.Contains(admin.AccessToken!, StringComparison.Ordinal), "credential body not captured");
                            HttpResponseMessage summary = await a.GetAsync("/v1.0/api/request-history/summary?fromUtc=" + Uri.EscapeDataString(DateTime.UtcNow.AddHours(-1).ToString("O")) + "&toUtc=" + Uri.EscapeDataString(DateTime.UtcNow.AddMinutes(1).ToString("O")) + "&bucketMinutes=15", token).ConfigureAwait(false);
                            RequestHistorySummary s = await ServerFixture.ReadAsync<RequestHistorySummary>(summary, token).ConfigureAwait(false);
                            TestAssert.True(s.TotalCount > 0 && s.Buckets.Count >= 4, "summary buckets");
                        }
                    }
                })
            });
        }

        /// <summary>
        /// Tunnel and relay suite.
        /// </summary>
        /// <returns>Suite.</returns>
        public static TestSuiteDescriptor Tunnel()
        {
            const string suite = "TunnelRelay";
            return new TestSuiteDescriptor(suite, "Tunnel and relay", new List<TestCaseDescriptor>
            {
                Cases.Async(suite, "HandshakeAndOnline", "An enrolled machine is welcomed, shows online, and the events socket hears about it", async (CancellationToken token) =>
                {
                    await using (ServerFixture f = await ServerFixture.StartAsync(token).ConfigureAwait(false))
                    {
                        EnrollResponse enrolled = await f.EnrollAsync(TestSettings.AdminEmail, TestSettings.AdminPassword, "studio", token).ConfigureAwait(false);
                        LoginResponse login = await f.MobileLoginAsync(TestSettings.AdminEmail, TestSettings.AdminPassword, token).ConfigureAwait(false);
                        using (HttpClient mobile = f.BearerClient(login.AccessToken))
                        {
                            await using (WsClient events = new WsClient())
                            {
                                await events.ConnectAsync(WsUrl(f, "/v1.0/events?ticket=" + await TicketAsync(mobile, token).ConfigureAwait(false)), null, null, token).ConfigureAwait(false);
                                TestAssert.True(await events.WaitForAsync("server.connected", _Wait).ConfigureAwait(false) != null, "events connected");
                                await using (FakeMachine machine = new FakeMachine(f.BaseUrl, enrolled.MachineId, enrolled.MachineSecret))
                                {
                                    await machine.ConnectAsync(token).ConfigureAwait(false);
                                    TestAssert.True(await machine.WaitWelcomeAsync(_Wait).ConfigureAwait(false), "welcomed");
                                    TestAssert.Equal("studio", machine.Welcome!.MachineName, "welcome carries the cloud name");
                                    TestAssert.True(machine.Welcome.Capabilities.Contains(TunnelCapabilities.HttpStreaming), "capabilities");
                                    TestAssert.True(await events.WaitForAsync("machine.online", _Wait).ConfigureAwait(false) != null, "machine.online event");
                                    MachineDto dto = await ServerFixture.ReadAsync<MachineDto>(await mobile.GetAsync("/v1.0/api/machines/" + enrolled.MachineId, token).ConfigureAwait(false), token).ConfigureAwait(false);
                                    TestAssert.True(dto.Online && dto.MuxVersion == "2.0.0-test", "online with version");
                                    await machine.SendStatusAsync(new MachineStatusPayload { ActiveRuns = 2, AwaitingApproval = 1, RemoteToolApproval = false }).ConfigureAwait(false);
                                    TestAssert.True(await events.WaitForAsync("\"awaitingApproval\":1", _Wait).ConfigureAwait(false) != null, "machine.updated carries status");
                                }

                                TestAssert.True(await events.WaitForAsync("machine.offline", _Wait).ConfigureAwait(false) != null, "machine.offline event");
                            }
                        }
                    }
                }),
                Cases.Async(suite, "HandshakeFailures", "Bad first frame, wrong proof, stale time, replay, unknown and revoked machines are refused with their codes", async (CancellationToken token) =>
                {
                    await using (ServerFixture f = await ServerFixture.StartAsync(token).ConfigureAwait(false))
                    {
                        EnrollResponse enrolled = await f.EnrollAsync(TestSettings.AdminEmail, TestSettings.AdminPassword, "studio", token).ConfigureAwait(false);
                        TestAssert.Equal((int?)TunnelCloseCodes.BadHandshake, await RejectAsync(f, enrolled, token, null, "{\"type\":\"tunnel.ping\"}").ConfigureAwait(false), "non-hello first frame");
                        TestAssert.Equal((int?)TunnelCloseCodes.Unauthorized, await RejectAsync(f, new EnrollResponse { MachineId = enrolled.MachineId, MachineSecret = TunnelProof.CreateMachineSecret() }, token, null, null).ConfigureAwait(false), "wrong secret");
                        TestAssert.Equal((int?)TunnelCloseCodes.Unauthorized, await RejectAsync(f, new EnrollResponse { MachineId = "mch_unknown", MachineSecret = enrolled.MachineSecret }, token, null, null).ConfigureAwait(false), "unknown machine");
                        TestAssert.Equal((int?)TunnelCloseCodes.Unauthorized, await RejectAsync(f, enrolled, token, (TunnelHelloPayload h) =>
                        {
                            h.TimestampUtc = TunnelProof.FormatTimestamp(DateTime.UtcNow.AddMinutes(-10));
                            h.Proof = TunnelProof.ComputeProof(enrolled.MachineSecret, enrolled.MachineId, h.TimestampUtc, h.Nonce);
                        }, null).ConfigureAwait(false), "stale timestamp");
                        string ts = TunnelProof.FormatTimestamp(DateTime.UtcNow);
                        string nonce = TunnelProof.CreateNonce();
                        Action<TunnelHelloPayload> fixedNonce = (TunnelHelloPayload h) =>
                        {
                            h.TimestampUtc = ts;
                            h.Nonce = nonce;
                            h.Proof = TunnelProof.ComputeProof(enrolled.MachineSecret, enrolled.MachineId, ts, nonce);
                        };
                        await using (FakeMachine first = new FakeMachine(f.BaseUrl, enrolled.MachineId, enrolled.MachineSecret))
                        {
                            await first.ConnectAsync(token, fixedNonce).ConfigureAwait(false);
                            TestAssert.True(await first.WaitWelcomeAsync(_Wait).ConfigureAwait(false), "first use of the nonce works");
                        }

                        TestAssert.Equal((int?)TunnelCloseCodes.Unauthorized, await RejectAsync(f, enrolled, token, fixedNonce, null).ConfigureAwait(false), "replayed nonce");
                        LoginResponse login = await f.MobileLoginAsync(TestSettings.AdminEmail, TestSettings.AdminPassword, token).ConfigureAwait(false);
                        using (HttpClient mobile = f.BearerClient(login.AccessToken))
                        {
                            TestAssert.Equal(HttpStatusCode.OK, (await mobile.PostAsync("/v1.0/api/machines/" + enrolled.MachineId + "/revoke", null, token).ConfigureAwait(false)).StatusCode, "revoke");
                        }

                        TestAssert.Equal((int?)TunnelCloseCodes.Revoked, await RejectAsync(f, enrolled, token, null, null).ConfigureAwait(false), "revoked machine");
                    }
                }),
                Cases.Async(suite, "ReplacementKeepsNewest", "A second connection replaces the first with 4409 and the old cleanup never takes the machine offline", async (CancellationToken token) =>
                {
                    await using (ServerFixture f = await ServerFixture.StartAsync(token).ConfigureAwait(false))
                    {
                        EnrollResponse enrolled = await f.EnrollAsync(TestSettings.AdminEmail, TestSettings.AdminPassword, "studio", token).ConfigureAwait(false);
                        LoginResponse login = await f.MobileLoginAsync(TestSettings.AdminEmail, TestSettings.AdminPassword, token).ConfigureAwait(false);
                        await using (FakeMachine a = new FakeMachine(f.BaseUrl, enrolled.MachineId, enrolled.MachineSecret))
                        await using (FakeMachine b = new FakeMachine(f.BaseUrl, enrolled.MachineId, enrolled.MachineSecret))
                        {
                            await a.ConnectAsync(token).ConfigureAwait(false);
                            TestAssert.True(await a.WaitWelcomeAsync(_Wait).ConfigureAwait(false), "a welcomed");
                            b.Respond = (HttpRequestPayload r) => new FakeResponse { Chunks = new List<string> { "{\"from\":\"b\"}" } };
                            await b.ConnectAsync(token).ConfigureAwait(false);
                            TestAssert.True(await b.WaitWelcomeAsync(_Wait).ConfigureAwait(false), "b welcomed");
                            TestAssert.Equal((int?)TunnelCloseCodes.Replaced, await a.WaitClosedAsync(_Wait).ConfigureAwait(false), "a replaced");
                            await Task.Delay(500, token).ConfigureAwait(false);
                            TestAssert.True(f.Server.Registry.IsOnline(enrolled.MachineId), "still online after a's cleanup");
                            using (HttpClient mobile = f.BearerClient(login.AccessToken))
                            {
                                string body = await (await mobile.GetAsync("/m/" + enrolled.MachineId + "/v1.0/api/sessions", token).ConfigureAwait(false)).Content.ReadAsStringAsync(token).ConfigureAwait(false);
                                TestAssert.Equal("{\"from\":\"b\"}", body, "relay reaches b");
                            }
                        }
                    }
                }),
                Cases.Async(suite, "RelayRest", "Relayed REST passes method, path, query, and body, filters cloud headers, and returns the machine's response", async (CancellationToken token) =>
                {
                    await using (ServerFixture f = await ServerFixture.StartAsync(token).ConfigureAwait(false))
                    {
                        EnrollResponse enrolled = await f.EnrollAsync(TestSettings.AdminEmail, TestSettings.AdminPassword, "studio", token).ConfigureAwait(false);
                        LoginResponse login = await f.MobileLoginAsync(TestSettings.AdminEmail, TestSettings.AdminPassword, token).ConfigureAwait(false);
                        await using (FakeMachine machine = new FakeMachine(f.BaseUrl, enrolled.MachineId, enrolled.MachineSecret))
                        {
                            machine.Respond = (HttpRequestPayload r) => new FakeResponse
                            {
                                StatusCode = 201,
                                Headers = new Dictionary<string, string> { { "X-Mux-Thing", "1" }, { "Set-Cookie", "machine=1" } },
                                Chunks = new List<string> { "{\"echo\":\"", Encoding.UTF8.GetString(Convert.FromBase64String(r.BodyBase64)), "\"}" }
                            };
                            await machine.ConnectAsync(token).ConfigureAwait(false);
                            TestAssert.True(await machine.WaitWelcomeAsync(_Wait).ConfigureAwait(false), "welcomed");
                            using (HttpClient mobile = f.BearerClient(login.AccessToken))
                            {
                                HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Put, "/m/" + enrolled.MachineId + "/v1.0/api/sessions?x=1&y=two") { Content = new StringContent("hello", Encoding.UTF8, "text/plain") };
                                request.Headers.Add("X-Client-Header", "kept");
                                HttpResponseMessage response = await mobile.SendAsync(request, token).ConfigureAwait(false);
                                TestAssert.Equal(HttpStatusCode.Created, response.StatusCode, "machine status");
                                TestAssert.Equal("{\"echo\":\"hello\"}", await response.Content.ReadAsStringAsync(token).ConfigureAwait(false), "machine body");
                                TestAssert.True(response.Headers.Contains("X-Mux-Thing") && !response.Headers.Contains("Set-Cookie"), "response headers filtered");
                            }

                            HttpRequestPayload seen = machine.Requests.Single();
                            TestAssert.Equal("PUT", seen.Method, "method");
                            TestAssert.Equal("/v1.0/api/sessions", seen.Path, "machine-local path");
                            TestAssert.Equal("x=1&y=two", seen.Query, "query");
                            TestAssert.True(seen.Headers.ContainsKey("X-Client-Header") && !seen.Headers.ContainsKey("Authorization") && !seen.Headers.ContainsKey("Cookie"), "cloud credentials never reach the machine");
                        }
                    }
                }),
                Cases.Async(suite, "RelaySseStreams", "Server-sent events arrive at the client as the machine produces them", async (CancellationToken token) =>
                {
                    await using (ServerFixture f = await ServerFixture.StartAsync(token).ConfigureAwait(false))
                    {
                        EnrollResponse enrolled = await f.EnrollAsync(TestSettings.AdminEmail, TestSettings.AdminPassword, "studio", token).ConfigureAwait(false);
                        LoginResponse login = await f.MobileLoginAsync(TestSettings.AdminEmail, TestSettings.AdminPassword, token).ConfigureAwait(false);
                        await using (FakeMachine machine = new FakeMachine(f.BaseUrl, enrolled.MachineId, enrolled.MachineSecret))
                        {
                            machine.Respond = (HttpRequestPayload r) => new FakeResponse { ContentType = "text/event-stream", ChunkDelayMs = 400, Chunks = new List<string> { "event: token\ndata: \"a\"\n\n", "event: token\ndata: \"b\"\n\n", "event: done\ndata: {}\n\n" } };
                            await machine.ConnectAsync(token).ConfigureAwait(false);
                            TestAssert.True(await machine.WaitWelcomeAsync(_Wait).ConfigureAwait(false), "welcomed");
                            using (HttpClient mobile = f.BearerClient(login.AccessToken))
                            {
                                HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Post, "/m/" + enrolled.MachineId + "/v1.0/api/chat/stream") { Content = ServerFixture.Json(new { messages = new[] { "hi" } }) };
                                Stopwatch watch = Stopwatch.StartNew();
                                HttpResponseMessage response = await mobile.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, token).ConfigureAwait(false);
                                TestAssert.True(response.Content.Headers.ContentType?.MediaType == "text/event-stream", "event stream content type");
                                Stream stream = await response.Content.ReadAsStreamAsync(token).ConfigureAwait(false);
                                byte[] buffer = new byte[4096];
                                List<long> arrivals = new List<long>();
                                StringBuilder all = new StringBuilder();
                                int n;
                                while ((n = await stream.ReadAsync(buffer, token).ConfigureAwait(false)) > 0)
                                {
                                    arrivals.Add(watch.ElapsedMilliseconds);
                                    all.Append(Encoding.UTF8.GetString(buffer, 0, n));
                                }

                                TestAssert.True(all.ToString().Contains("event: done", StringComparison.Ordinal), "full stream");
                                TestAssert.True(arrivals.Count >= 2, "arrived in more than one piece: " + arrivals.Count);
                                TestAssert.True(arrivals.Last() - arrivals.First() >= 500, "pieces spread over time: " + String.Join(",", arrivals));
                            }
                        }
                    }
                }),
                Cases.Async(suite, "RelayWebSocket", "A relayed WebSocket carries frames both ways", async (CancellationToken token) =>
                {
                    await using (ServerFixture f = await ServerFixture.StartAsync(token).ConfigureAwait(false))
                    {
                        EnrollResponse enrolled = await f.EnrollAsync(TestSettings.AdminEmail, TestSettings.AdminPassword, "studio", token).ConfigureAwait(false);
                        LoginResponse login = await f.MobileLoginAsync(TestSettings.AdminEmail, TestSettings.AdminPassword, token).ConfigureAwait(false);
                        await using (FakeMachine machine = new FakeMachine(f.BaseUrl, enrolled.MachineId, enrolled.MachineSecret))
                        {
                            await machine.ConnectAsync(token).ConfigureAwait(false);
                            TestAssert.True(await machine.WaitWelcomeAsync(_Wait).ConfigureAwait(false), "welcomed");
                            using (HttpClient mobile = f.BearerClient(login.AccessToken))
                            {
                                await using (WsClient client = new WsClient())
                                {
                                    await client.ConnectAsync(WsUrl(f, "/m/" + enrolled.MachineId + "/v1.0/ws?ticket=" + await TicketAsync(mobile, token).ConfigureAwait(false)), null, null, token).ConfigureAwait(false);
                                    await WaitUntilAsync(() => machine.OpenedChannels.Count > 0).ConfigureAwait(false);
                                    await Task.Delay(200, token).ConfigureAwait(false);
                                    await client.SendAsync("{\"action\":\"subscribe\",\"all\":true}").ConfigureAwait(false);
                                    TestAssert.True(await client.WaitForAsync("echo:{\"action\":\"subscribe\"", _Wait).ConfigureAwait(false) != null, "client to machine and back");
                                    machine.OpenedChannels.TryPeek(out string? channelId);
                                    await machine.PushAsync(channelId!, "{\"eventType\":\"sessions_changed\"}").ConfigureAwait(false);
                                    TestAssert.True(await client.WaitForAsync("sessions_changed", _Wait).ConfigureAwait(false) != null, "machine push reaches client");
                                }
                            }
                        }
                    }
                }),
                Cases.Async(suite, "CancelAndTimeout", "A client that leaves cancels the machine request, and a silent machine yields 504", async (CancellationToken token) =>
                {
                    await using (ServerFixture f = await ServerFixture.StartAsync(token, (MuxCloud.Core.Settings.MuxCloudSettings s) => s.Tunnel.FirstByteTimeoutSeconds = 2).ConfigureAwait(false))
                    {
                        EnrollResponse enrolled = await f.EnrollAsync(TestSettings.AdminEmail, TestSettings.AdminPassword, "studio", token).ConfigureAwait(false);
                        LoginResponse login = await f.MobileLoginAsync(TestSettings.AdminEmail, TestSettings.AdminPassword, token).ConfigureAwait(false);
                        await using (FakeMachine machine = new FakeMachine(f.BaseUrl, enrolled.MachineId, enrolled.MachineSecret))
                        {
                            machine.Respond = (HttpRequestPayload r) => r.Path.EndsWith("/silent", StringComparison.Ordinal)
                                ? new FakeResponse { NeverRespond = true }
                                : new FakeResponse { ContentType = "text/event-stream", ChunkDelayMs = 300, Chunks = Enumerable.Range(0, 50).Select(i => "data: " + i + "\n\n").ToList() };
                            await machine.ConnectAsync(token).ConfigureAwait(false);
                            TestAssert.True(await machine.WaitWelcomeAsync(_Wait).ConfigureAwait(false), "welcomed");
                            using (HttpClient mobile = f.BearerClient(login.AccessToken))
                            {
                                HttpResponseMessage silent = await mobile.GetAsync("/m/" + enrolled.MachineId + "/v1.0/api/silent", token).ConfigureAwait(false);
                                TestAssert.Equal(HttpStatusCode.GatewayTimeout, silent.StatusCode, "504 when the machine never starts");
                                await WaitUntilAsync(() => machine.Cancelled.Count >= 1).ConfigureAwait(false);
                                int before = machine.Cancelled.Count;
                                HttpResponseMessage streaming = await mobile.GetAsync("/m/" + enrolled.MachineId + "/v1.0/api/chat/stream", HttpCompletionOption.ResponseHeadersRead, token).ConfigureAwait(false);
                                Stream stream = await streaming.Content.ReadAsStreamAsync(token).ConfigureAwait(false);
                                byte[] buffer = new byte[256];
                                await stream.ReadAsync(buffer, token).ConfigureAwait(false);
                                streaming.Dispose();
                            }

                            TestAssert.True(await WaitUntilAsync(() => machine.Cancelled.Count >= 2).ConfigureAwait(false), "client disconnect sends http.cancel");
                        }
                    }
                }),
                Cases.Async(suite, "IsolationAndOffline", "Another account's machine is 404, an offline machine is 503", async (CancellationToken token) =>
                {
                    await using (ServerFixture f = await ServerFixture.StartAsync(token).ConfigureAwait(false))
                    {
                        EnrollResponse enrolled = await f.EnrollAsync(TestSettings.AdminEmail, TestSettings.AdminPassword, "studio", token).ConfigureAwait(false);
                        await f.CreateVerifiedUserAsync("eve@example.com", "eve password 123", token).ConfigureAwait(false);
                        LoginResponse eve = await f.MobileLoginAsync("eve@example.com", "eve password 123", token).ConfigureAwait(false);
                        LoginResponse admin = await f.MobileLoginAsync(TestSettings.AdminEmail, TestSettings.AdminPassword, token).ConfigureAwait(false);
                        await using (FakeMachine machine = new FakeMachine(f.BaseUrl, enrolled.MachineId, enrolled.MachineSecret))
                        {
                            await machine.ConnectAsync(token).ConfigureAwait(false);
                            TestAssert.True(await machine.WaitWelcomeAsync(_Wait).ConfigureAwait(false), "welcomed");
                            using (HttpClient e = f.BearerClient(eve.AccessToken))
                            {
                                TestAssert.Equal(HttpStatusCode.NotFound, (await e.GetAsync("/m/" + enrolled.MachineId + "/v1.0/api/sessions", token).ConfigureAwait(false)).StatusCode, "other account sees 404");
                                TestAssert.Equal(HttpStatusCode.NotFound, (await e.GetAsync("/v1.0/api/machines/" + enrolled.MachineId, token).ConfigureAwait(false)).StatusCode, "other account cannot read the machine");
                            }

                            TestAssert.True(machine.Requests.IsEmpty, "nothing reached the machine");
                        }

                        await WaitUntilAsync(() => !f.Server.Registry.IsOnline(enrolled.MachineId)).ConfigureAwait(false);
                        using (HttpClient a = f.BearerClient(admin.AccessToken))
                        {
                            HttpResponseMessage offline = await a.GetAsync("/m/" + enrolled.MachineId + "/v1.0/api/sessions", token).ConfigureAwait(false);
                            TestAssert.Equal(HttpStatusCode.ServiceUnavailable, offline.StatusCode, "offline is 503");
                            TestAssert.True((await offline.Content.ReadAsStringAsync(token).ConfigureAwait(false)).Contains("MachineOffline", StringComparison.Ordinal), "MachineOffline code");
                        }
                    }
                }),
                Cases.Async(suite, "RevokeClosesTunnel", "Revoking a machine closes its live tunnel with 4403", async (CancellationToken token) =>
                {
                    await using (ServerFixture f = await ServerFixture.StartAsync(token).ConfigureAwait(false))
                    {
                        EnrollResponse enrolled = await f.EnrollAsync(TestSettings.AdminEmail, TestSettings.AdminPassword, "studio", token).ConfigureAwait(false);
                        LoginResponse admin = await f.MobileLoginAsync(TestSettings.AdminEmail, TestSettings.AdminPassword, token).ConfigureAwait(false);
                        await using (FakeMachine machine = new FakeMachine(f.BaseUrl, enrolled.MachineId, enrolled.MachineSecret))
                        {
                            await machine.ConnectAsync(token).ConfigureAwait(false);
                            TestAssert.True(await machine.WaitWelcomeAsync(_Wait).ConfigureAwait(false), "welcomed");
                            using (HttpClient a = f.BearerClient(admin.AccessToken))
                            {
                                await a.PostAsync("/v1.0/api/machines/" + enrolled.MachineId + "/revoke", null, token).ConfigureAwait(false);
                            }

                            TestAssert.Equal((int?)TunnelCloseCodes.Revoked, await machine.WaitClosedAsync(_Wait).ConfigureAwait(false), "closed 4403");
                        }
                    }
                }),
                Cases.Async(suite, "MachineSignOut", "A machine signs itself out with a sign-out proof: bad proofs are 401, a good one revokes and closes the tunnel", async (CancellationToken token) =>
                {
                    await using (ServerFixture f = await ServerFixture.StartAsync(token).ConfigureAwait(false))
                    {
                        EnrollResponse enrolled = await f.EnrollAsync(TestSettings.AdminEmail, TestSettings.AdminPassword, "studio", token).ConfigureAwait(false);
                        await using (FakeMachine machine = new FakeMachine(f.BaseUrl, enrolled.MachineId, enrolled.MachineSecret))
                        {
                            await machine.ConnectAsync(token).ConfigureAwait(false);
                            TestAssert.True(await machine.WaitWelcomeAsync(_Wait).ConfigureAwait(false), "welcomed");
                            using (HttpClient anon = f.BearerClient(null))
                            {
                                MachineSignOutRequest wrongSecret = MachineSignOutRequest.Create(enrolled.MachineId, "mcs_not-the-secret", DateTime.UtcNow);
                                TestAssert.Equal(HttpStatusCode.Unauthorized, (await PostSignOutAsync(anon, wrongSecret, token).ConfigureAwait(false)).StatusCode, "wrong secret");
                                MachineSignOutRequest stale = MachineSignOutRequest.Create(enrolled.MachineId, enrolled.MachineSecret, DateTime.UtcNow.AddMinutes(-10));
                                TestAssert.Equal(HttpStatusCode.Unauthorized, (await PostSignOutAsync(anon, stale, token).ConfigureAwait(false)).StatusCode, "stale timestamp");
                                MachineSignOutRequest tunnelProof = MachineSignOutRequest.Create(enrolled.MachineId, enrolled.MachineSecret, DateTime.UtcNow);
                                tunnelProof.Proof = TunnelProof.ComputeProof(enrolled.MachineSecret, enrolled.MachineId, tunnelProof.TimestampUtc, tunnelProof.Nonce);
                                TestAssert.Equal(HttpStatusCode.Unauthorized, (await PostSignOutAsync(anon, tunnelProof, token).ConfigureAwait(false)).StatusCode, "a handshake proof is not a sign-out proof");
                                MachineSignOutRequest unknown = MachineSignOutRequest.Create("mch_unknown", enrolled.MachineSecret, DateTime.UtcNow);
                                TestAssert.Equal(HttpStatusCode.Unauthorized, (await PostSignOutAsync(anon, unknown, token).ConfigureAwait(false)).StatusCode, "unknown machine");
                                TestAssert.True(f.Server.Registry.IsOnline(enrolled.MachineId), "still online after bad requests");

                                MachineSignOutRequest good = MachineSignOutRequest.Create(enrolled.MachineId, enrolled.MachineSecret, DateTime.UtcNow);
                                TestAssert.Equal(HttpStatusCode.NoContent, (await PostSignOutAsync(anon, good, token).ConfigureAwait(false)).StatusCode, "signed out");
                                TestAssert.Equal((int?)TunnelCloseCodes.Revoked, await machine.WaitClosedAsync(_Wait).ConfigureAwait(false), "tunnel closed 4403");
                                Machine? stored = await f.Server.Database.Machines.ReadAsync(enrolled.MachineId, token).ConfigureAwait(false);
                                TestAssert.True(stored != null && stored.RevokedUtc != null, "revoked in the database");
                                TestAssert.Equal(HttpStatusCode.Unauthorized, (await PostSignOutAsync(anon, MachineSignOutRequest.Create(enrolled.MachineId, enrolled.MachineSecret, DateTime.UtcNow), token).ConfigureAwait(false)).StatusCode, "second sign-out is refused");
                            }
                        }

                        Machine signedOut = (await f.Server.Database.Machines.ReadAsync(enrolled.MachineId, token).ConfigureAwait(false))!;
                        EnrollRequest reenroll = new EnrollRequest { Email = TestSettings.AdminEmail, Password = TestSettings.AdminPassword, MachineName = "studio", Fingerprint = signedOut.Fingerprint };
                        EnrollResult again = await f.Server.Machines.EnrollAsync(reenroll, "198.51.100.1", token).ConfigureAwait(false);
                        TestAssert.Equal(enrolled.MachineId, again.Machine.Id, "signing in again restores the same machine");
                        Machine? restored = await f.Server.Database.Machines.ReadAsync(again.Machine.Id, token).ConfigureAwait(false);
                        TestAssert.True(restored != null && restored.RevokedUtc == null, "no longer revoked");
                    }
                }),
                Cases.Async(suite, "HeartbeatEviction", "A machine that stops answering pings is evicted with 4408", async (CancellationToken token) =>
                {
                    await using (ServerFixture f = await ServerFixture.StartAsync(token, (MuxCloud.Core.Settings.MuxCloudSettings s) => { s.Tunnel.HeartbeatSeconds = 5; s.Tunnel.MissedHeartbeats = 1; }).ConfigureAwait(false))
                    {
                        EnrollResponse enrolled = await f.EnrollAsync(TestSettings.AdminEmail, TestSettings.AdminPassword, "studio", token).ConfigureAwait(false);
                        await using (FakeMachine machine = new FakeMachine(f.BaseUrl, enrolled.MachineId, enrolled.MachineSecret) { AnswerPings = false })
                        {
                            await machine.ConnectAsync(token).ConfigureAwait(false);
                            TestAssert.True(await machine.WaitWelcomeAsync(_Wait).ConfigureAwait(false), "welcomed");
                            TestAssert.Equal((int?)TunnelCloseCodes.HeartbeatTimeout, await machine.WaitClosedAsync(TimeSpan.FromSeconds(20)).ConfigureAwait(false), "evicted");
                            TestAssert.True(await WaitUntilAsync(() => !f.Server.Registry.IsOnline(enrolled.MachineId)).ConfigureAwait(false), "offline after eviction");
                        }
                    }
                }),
                Cases.Async(suite, "RelayHistoryHasNoBodies", "Request history records relay traffic by template without bodies", async (CancellationToken token) =>
                {
                    await using (ServerFixture f = await ServerFixture.StartAsync(token).ConfigureAwait(false))
                    {
                        EnrollResponse enrolled = await f.EnrollAsync(TestSettings.AdminEmail, TestSettings.AdminPassword, "studio", token).ConfigureAwait(false);
                        LoginResponse admin = await f.MobileLoginAsync(TestSettings.AdminEmail, TestSettings.AdminPassword, token).ConfigureAwait(false);
                        await using (FakeMachine machine = new FakeMachine(f.BaseUrl, enrolled.MachineId, enrolled.MachineSecret))
                        {
                            machine.Respond = (HttpRequestPayload r) => new FakeResponse { Chunks = new List<string> { "{\"secret\":\"conversation text\"}" } };
                            await machine.ConnectAsync(token).ConfigureAwait(false);
                            TestAssert.True(await machine.WaitWelcomeAsync(_Wait).ConfigureAwait(false), "welcomed");
                            using (HttpClient a = f.BearerClient(admin.AccessToken))
                            {
                                await a.PostAsync("/m/" + enrolled.MachineId + "/v1.0/api/chat", ServerFixture.Json(new { prompt = "private prompt" }), token).ConfigureAwait(false);
                                await Task.Delay(400, token).ConfigureAwait(false);
                                PagedResult<RequestHistoryEntry> page = await ServerFixture.ReadAsync<PagedResult<RequestHistoryEntry>>(await a.GetAsync("/v1.0/api/request-history?pathContains=/m/", token).ConfigureAwait(false), token).ConfigureAwait(false);
                                RequestHistoryEntry entry = page.Items.First(i => i.IsRelay);
                                RequestHistoryEntry detail = await ServerFixture.ReadAsync<RequestHistoryEntry>(await a.GetAsync("/v1.0/api/request-history/" + entry.Id, token).ConfigureAwait(false), token).ConfigureAwait(false);
                                TestAssert.Equal("/m/{machineId}/*", detail.Path, "path is a template");
                                TestAssert.True(detail.RequestBody.Length == 0 && detail.ResponseBody.Length == 0 && detail.RequestHeaders.Length == 0, "no bodies or headers");
                                TestAssert.True(detail.ResponseBytes > 0, "sizes recorded");
                            }
                        }
                    }
                })
            });
        }

        #endregion

        #region Private-Methods

        private static Task<HttpResponseMessage> PostSignOutAsync(HttpClient client, MachineSignOutRequest request, CancellationToken token)
        {
            StringContent body = new StringContent(TunnelProtocol.SerializeSignOut(request), Encoding.UTF8, "application/json");
            return client.PostAsync(TunnelProtocol.SignOutPath, body, token);
        }

        private static string WsUrl(ServerFixture f, string path)
        {
            return f.BaseUrl.Replace("http://", "ws://", StringComparison.Ordinal) + path;
        }

        private static async Task<string> TicketAsync(HttpClient mobile, CancellationToken token)
        {
            HttpResponseMessage response = await mobile.PostAsync("/v1.0/api/ws-tickets", null, token).ConfigureAwait(false);
            return Uri.EscapeDataString((await ServerFixture.ReadAsync<WsTicketResponse>(response, token).ConfigureAwait(false)).Ticket);
        }

        private static async Task<int?> RejectAsync(ServerFixture f, EnrollResponse enrolled, CancellationToken token, Action<TunnelHelloPayload>? mutate, string? firstFrame)
        {
            await using (FakeMachine machine = new FakeMachine(f.BaseUrl, enrolled.MachineId, enrolled.MachineSecret))
            {
                await machine.ConnectAsync(token, mutate, firstFrame).ConfigureAwait(false);
                return await machine.WaitClosedAsync(_Wait).ConfigureAwait(false);
            }
        }

        private static async Task<bool> WaitUntilAsync(Func<bool> condition)
        {
            DateTime until = DateTime.UtcNow + _Wait;
            while (DateTime.UtcNow < until)
            {
                if (condition()) return true;
                await Task.Delay(25).ConfigureAwait(false);
            }

            return condition();
        }

        #endregion
    }
}
