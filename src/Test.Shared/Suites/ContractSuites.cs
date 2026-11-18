namespace Test.Shared.Suites
{
    using System;
    using System.Collections.Generic;
    using System.IO;
    using System.Linq;
    using System.Net;
    using System.Net.Http;
    using System.Threading;
    using System.Threading.Tasks;
    using MuxCloud.Core.Responses;
    using MuxCloud.Protocol;
    using Touchstone.Core;

    /// <summary>
    /// Contracts the dashboard depends on: response shapes and security headers.
    /// </summary>
    public static class ContractSuites
    {
        #region Private-Members

        private static readonly TimeSpan _Wait = TimeSpan.FromSeconds(10);

        #endregion

        #region Public-Methods

        /// <summary>
        /// Dashboard contract suite.
        /// </summary>
        /// <returns>Suite.</returns>
        public static TestSuiteDescriptor Dashboard()
        {
            const string suite = "DashboardContract";
            return new TestSuiteDescriptor(suite, "Dashboard contract", new List<TestCaseDescriptor>
            {
                Cases.Async(suite, "SpaCsp", "The SPA is served at / and for client routes with the strict CSP; relayed machine pages get only same-origin framing", async (CancellationToken token) =>
                {
                    string dir = Path.Combine(Path.GetTempPath(), "muxcloud-spa-" + Guid.NewGuid().ToString("N"));
                    Directory.CreateDirectory(Path.Combine(dir, "assets"));
                    File.WriteAllText(Path.Combine(dir, "index.html"), "<!doctype html><html><body><div id=\"root\"></div><script type=\"module\" src=\"/assets/app.js\"></script></body></html>");
                    File.WriteAllText(Path.Combine(dir, "assets", "app.js"), "console.log('x')");
                    await using (ServerFixture f = await ServerFixture.StartAsync(token, (MuxCloud.Core.Settings.MuxCloudSettings s) => s.Server.DashboardDirectory = dir).ConfigureAwait(false))
                    {
                        using (HttpClient client = f.BearerClient(null))
                        {
                            foreach (string path in new[] { "/", "/machines/mch_x" })
                            {
                                HttpResponseMessage page = await client.GetAsync(path, token).ConfigureAwait(false);
                                TestAssert.Equal(HttpStatusCode.OK, page.StatusCode, path + " status");
                                string csp = String.Join(";", page.Headers.GetValues("Content-Security-Policy"));
                                TestAssert.True(csp.Contains("script-src 'self'", StringComparison.Ordinal) && csp.Contains("frame-ancestors 'self'", StringComparison.Ordinal) && csp.Contains("default-src 'self'", StringComparison.Ordinal), path + " strict CSP: " + csp);
                                TestAssert.True((await page.Content.ReadAsStringAsync(token).ConfigureAwait(false)).Contains("id=\"root\"", StringComparison.Ordinal), path + " serves index.html");
                            }

                            HttpResponseMessage asset = await client.GetAsync("/assets/app.js", token).ConfigureAwait(false);
                            TestAssert.True(asset.Content.Headers.ContentType?.MediaType == "text/javascript" && asset.Headers.CacheControl?.MaxAge?.TotalDays > 300, "hashed asset cached");
                            TestAssert.Equal(HttpStatusCode.NotFound, (await client.GetAsync("/v1.0/api/nothing", token).ConfigureAwait(false)).StatusCode, "API paths never fall back to the SPA");
                            TestAssert.Equal(HttpStatusCode.NotFound, (await client.GetAsync("/assets/AccountPage-old.js", token).ConfigureAwait(false)).StatusCode, "a chunk from an older build is a 404, not the SPA shell");
                            TestAssert.Equal(HttpStatusCode.NotFound, (await client.GetAsync("/logo-missing.png", token).ConfigureAwait(false)).StatusCode, "a missing static file is a 404");
                        }

                        EnrollResponse enrolled = await f.EnrollAsync(TestSettings.AdminEmail, TestSettings.AdminPassword, "studio", token).ConfigureAwait(false);
                        LoginResponse admin = await f.MobileLoginAsync(TestSettings.AdminEmail, TestSettings.AdminPassword, token).ConfigureAwait(false);
                        await using (FakeMachine machine = new FakeMachine(f.BaseUrl, enrolled.MachineId, enrolled.MachineSecret))
                        {
                            machine.Respond = (HttpRequestPayload r) => new FakeResponse { ContentType = "text/html; charset=utf-8", Chunks = new List<string> { "<html><script>var API_KEY=\"\";</script></html>" } };
                            await machine.ConnectAsync(token).ConfigureAwait(false);
                            TestAssert.True(await machine.WaitWelcomeAsync(_Wait).ConfigureAwait(false), "welcomed");
                            using (HttpClient a = f.BearerClient(admin.AccessToken))
                            {
                                HttpResponseMessage relayed = await a.GetAsync("/m/" + enrolled.MachineId + "/dashboard", token).ConfigureAwait(false);
                                string csp = String.Join(";", relayed.Headers.GetValues("Content-Security-Policy"));
                                TestAssert.Equal("frame-ancestors 'self'", csp, "relayed page CSP is framing only");
                                TestAssert.Equal("SAMEORIGIN", relayed.Headers.GetValues("X-Frame-Options").Single(), "relayed page framing");
                            }
                        }
                    }

                    Directory.Delete(dir, true);
                }),
                Cases.Sync(suite, "EnvOverrides", "Deployment environment variables override settings, and a bad boolean is rejected", () =>
                {
                    MuxCloud.Core.Settings.MuxCloudSettings settings = new MuxCloud.Core.Settings.MuxCloudSettings();
                    System.Collections.Hashtable env = new System.Collections.Hashtable
                    {
                        { "MUXCLOUD_PUBLIC_URL", "https://app.usemux.ai" },
                        { "MUXCLOUD_TRUST_FORWARDED_HEADERS", "true" },
                        { "MUXCLOUD_REST_PORT", "8800" },
                    };
                    MuxCloud.Core.Settings.SettingsLoader.ApplyEnvironment(settings, env);
                    TestAssert.Equal("https://app.usemux.ai", settings.Server.PublicUrl, "public url");
                    TestAssert.True(settings.Server.TrustForwardedHeaders, "trust forwarded headers");
                    TestAssert.True(settings.EnvironmentOverrides.Contains("Server.TrustForwardedHeaders"), "override recorded");
                    bool threw = false;
                    try
                    {
                        MuxCloud.Core.Settings.SettingsLoader.ApplyEnvironment(new MuxCloud.Core.Settings.MuxCloudSettings(), new System.Collections.Hashtable { { "MUXCLOUD_TRUST_FORWARDED_HEADERS", "yes" } });
                    }
                    catch (InvalidDataException)
                    {
                        threw = true;
                    }
                    TestAssert.True(threw, "non-boolean rejected");
                }),
                Cases.Async(suite, "AdminShapes", "Audit records carry principal, overrides carry limit and expiresUtc, and users carry active and lastLoginUtc", async (CancellationToken token) =>
                {
                    await using (ServerFixture f = await ServerFixture.StartAsync(token).ConfigureAwait(false))
                    {
                        LoginResponse admin = await f.MobileLoginAsync(TestSettings.AdminEmail, TestSettings.AdminPassword, token).ConfigureAwait(false);
                        using (HttpClient a = f.BearerClient(admin.AccessToken))
                        {
                            string audit = await (await a.GetAsync("/v1.0/api/admin/audit?eventType=auth.login", token).ConfigureAwait(false)).Content.ReadAsStringAsync(token).ConfigureAwait(false);
                            TestAssert.True(audit.Contains("\"principal\":\"" + TestSettings.AdminEmail + "\"", StringComparison.Ordinal) && audit.Contains("\"eventType\":\"auth.login\"", StringComparison.Ordinal) && audit.Contains("\"sourceIp\"", StringComparison.Ordinal), "audit shape: " + audit);
                            HttpResponseMessage created = await a.PostAsync("/v1.0/api/admin/accounts/" + admin.User.AccountId + "/overrides", ServerFixture.Json(new { featureKey = "machines.max", limit = (long?)null, reason = "comp" }), token).ConfigureAwait(false);
                            string body = await created.Content.ReadAsStringAsync(token).ConfigureAwait(false);
                            TestAssert.True(body.Contains("\"limit\":null", StringComparison.Ordinal) && body.Contains("\"expiresUtc\":null", StringComparison.Ordinal) && !body.Contains("limitValue", StringComparison.Ordinal), "override shape: " + body);
                            string list = await (await a.GetAsync("/v1.0/api/admin/accounts/" + admin.User.AccountId + "/overrides", token).ConfigureAwait(false)).Content.ReadAsStringAsync(token).ConfigureAwait(false);
                            TestAssert.True(list.Contains("\"featureKey\":\"machines.max\"", StringComparison.Ordinal) && list.Contains("\"limit\":null", StringComparison.Ordinal), "override list shape");
                            string users = await (await a.GetAsync("/v1.0/api/admin/users", token).ConfigureAwait(false)).Content.ReadAsStringAsync(token).ConfigureAwait(false);
                            TestAssert.True(users.Contains("\"active\":true", StringComparison.Ordinal) && users.Contains("\"lastLoginUtc\"", StringComparison.Ordinal), "user shape");
                        }
                    }
                })
            });
        }

        #endregion
    }
}
