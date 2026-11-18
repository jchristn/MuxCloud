namespace Test.Shared.Suites
{
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Net;
    using System.Net.Http;
    using System.Threading;
    using System.Threading.Tasks;
    using MuxCloud.Core;
    using MuxCloud.Core.Models;
    using MuxCloud.Core.Requests;
    using MuxCloud.Core.Responses;
    using MuxCloud.Core.Settings;
    using MuxCloud.Protocol;
    using Touchstone.Core;

    /// <summary>
    /// Push device registration over HTTP and push dispatch on machine status pushes.
    /// </summary>
    public static class DeviceSuites
    {
        #region Private-Members

        private static readonly TimeSpan _Wait = TimeSpan.FromSeconds(10);

        #endregion

        #region Public-Methods

        /// <summary>
        /// Devices and push suite.
        /// </summary>
        /// <returns>Suite.</returns>
        public static TestSuiteDescriptor Devices()
        {
            const string suite = "DevicesPush";
            return new TestSuiteDescriptor(suite, "Push devices", new List<TestCaseDescriptor>
            {
                Cases.Async(suite, "RegisterListDelete", "Register is 201 then 200 for the same token, the token is never returned, and deletes are owner-only", async (CancellationToken token) =>
                {
                    await using (ServerFixture f = await ServerFixture.StartAsync(token).ConfigureAwait(false))
                    {
                        await f.CreateVerifiedUserAsync("eve@example.com", "eve password 123", token).ConfigureAwait(false);
                        LoginResponse admin = await f.MobileLoginAsync(TestSettings.AdminEmail, TestSettings.AdminPassword, token).ConfigureAwait(false);
                        LoginResponse eve = await f.MobileLoginAsync("eve@example.com", "eve password 123", token).ConfigureAwait(false);
                        using (HttpClient a = f.BearerClient(admin.AccessToken))
                        using (HttpClient e = f.BearerClient(eve.AccessToken))
                        {
                            DeviceRegisterRequest request = new DeviceRegisterRequest { ExpoPushToken = "ExponentPushToken[abc123]", Platform = "ios", Name = "iPhone" };
                            HttpResponseMessage first = await a.PostAsync("/v1.0/api/devices", ServerFixture.Json(request), token).ConfigureAwait(false);
                            TestAssert.Equal(HttpStatusCode.Created, first.StatusCode, "new device");
                            string firstBody = await first.Content.ReadAsStringAsync(token).ConfigureAwait(false);
                            TestAssert.True(!firstBody.Contains("abc123", StringComparison.Ordinal) && firstBody.Contains("dev_", StringComparison.Ordinal), "token not returned; dev_ prefix");
                            DeviceDto created = await ServerFixture.ReadAsync<DeviceDto>(first, token).ConfigureAwait(false);
                            HttpResponseMessage again = await a.PostAsync("/v1.0/api/devices", ServerFixture.Json(request), token).ConfigureAwait(false);
                            TestAssert.Equal(HttpStatusCode.OK, again.StatusCode, "same token is 200");
                            TestAssert.Equal(created.Id, (await ServerFixture.ReadAsync<DeviceDto>(again, token).ConfigureAwait(false)).Id, "same device");
                            TestAssert.Equal(HttpStatusCode.BadRequest, (await a.PostAsync("/v1.0/api/devices", ServerFixture.Json(new DeviceRegisterRequest { ExpoPushToken = "not-a-token", Platform = "ios" }), token).ConfigureAwait(false)).StatusCode, "bad token");
                            TestAssert.Equal(HttpStatusCode.BadRequest, (await a.PostAsync("/v1.0/api/devices", ServerFixture.Json(new DeviceRegisterRequest { ExpoPushToken = "ExponentPushToken[x123456789]", Platform = "windows" }), token).ConfigureAwait(false)).StatusCode, "bad platform");
                            HttpResponseMessage list = await a.GetAsync("/v1.0/api/devices", token).ConfigureAwait(false);
                            string listBody = await list.Content.ReadAsStringAsync(token).ConfigureAwait(false);
                            TestAssert.True(listBody.Contains(created.Id, StringComparison.Ordinal) && !listBody.Contains("ExponentPushToken", StringComparison.Ordinal), "list without tokens");
                            TestAssert.Equal(0, (await ServerFixture.ReadAsync<List<DeviceDto>>(await e.GetAsync("/v1.0/api/devices", token).ConfigureAwait(false), token).ConfigureAwait(false)).Count, "other user sees none");
                            TestAssert.Equal(HttpStatusCode.NotFound, (await e.DeleteAsync("/v1.0/api/devices/" + created.Id, token).ConfigureAwait(false)).StatusCode, "other user cannot delete");
                            TestAssert.Equal(HttpStatusCode.NoContent, (await a.DeleteAsync("/v1.0/api/devices/" + created.Id, token).ConfigureAwait(false)).StatusCode, "owner deletes");
                            TestAssert.Equal(HttpStatusCode.Unauthorized, (await f.BearerClient(null).GetAsync("/v1.0/api/devices", token).ConfigureAwait(false)).StatusCode, "anonymous refused");
                        }
                    }
                }),
                Cases.Async(suite, "DispatchOnStatus", "Approval and run-completed pushes reach every device with deep-link data and no content, and unregistered devices are removed", async (CancellationToken token) =>
                {
                    await using (ServerFixture f = await ServerFixture.StartAsync(token).ConfigureAwait(false))
                    {
                        FakePushSender push = new FakePushSender();
                        f.Server.Devices.Sender = push;
                        push.Unregistered.Add("ExponentPushToken[gone]");
                        EnrollResponse enrolled = await f.EnrollAsync(TestSettings.AdminEmail, TestSettings.AdminPassword, "studio", token).ConfigureAwait(false);
                        LoginResponse admin = await f.MobileLoginAsync(TestSettings.AdminEmail, TestSettings.AdminPassword, token).ConfigureAwait(false);
                        using (HttpClient a = f.BearerClient(admin.AccessToken))
                        {
                            await a.PostAsync("/v1.0/api/devices", ServerFixture.Json(new DeviceRegisterRequest { ExpoPushToken = "ExponentPushToken[keep]", Platform = "ios" }), token).ConfigureAwait(false);
                            await a.PostAsync("/v1.0/api/devices", ServerFixture.Json(new DeviceRegisterRequest { ExpoPushToken = "ExponentPushToken[gone]", Platform = "android" }), token).ConfigureAwait(false);
                            await using (FakeMachine machine = new FakeMachine(f.BaseUrl, enrolled.MachineId, enrolled.MachineSecret))
                            {
                                await machine.ConnectAsync(token).ConfigureAwait(false);
                                TestAssert.True(await machine.WaitWelcomeAsync(_Wait).ConfigureAwait(false), "welcomed");
                                await machine.SendStatusAsync(new MachineStatusPayload { Kind = MachineStatusKinds.Status, ActiveRuns = 1 }).ConfigureAwait(false);
                                await machine.SendStatusAsync(new MachineStatusPayload { Kind = MachineStatusKinds.ApprovalRequested, SessionId = "sess1", RunId = "run1", Title = "secret conversation title", AwaitingApproval = 1 }).ConfigureAwait(false);
                                TestAssert.True(await WaitUntilAsync(() => push.Sent.Count >= 2).ConfigureAwait(false), "two devices notified");
                                await Task.Delay(300, token).ConfigureAwait(false);
                                TestAssert.Equal(2, push.Sent.Count, "plain status sends nothing");
                                PushMessage message = push.Sent.First();
                                TestAssert.Equal("studio", message.Title, "title is the machine name");
                                TestAssert.True(!message.Body.Contains("secret", StringComparison.Ordinal) && !message.Title.Contains("secret", StringComparison.Ordinal), "no conversation content");
                                TestAssert.True(message.Data["machineId"] == enrolled.MachineId && message.Data["sessionId"] == "sess1" && message.Data["runId"] == "run1" && message.Data["kind"] == "approval_requested", "deep-link data");
                                TestAssert.True(await WaitUntilAsync(() => f.Server.Database.Devices.ListForUserAsync(admin.User.TenantId, admin.User.Id, CancellationToken.None).Result.Count == 1).ConfigureAwait(false), "unregistered device removed");
                                await machine.SendStatusAsync(new MachineStatusPayload { Kind = MachineStatusKinds.RunCompleted, SessionId = "sess1", RunId = "run1" }).ConfigureAwait(false);
                                TestAssert.True(await WaitUntilAsync(() => push.Sent.Count >= 3).ConfigureAwait(false), "run completed notifies the remaining device");
                                TestAssert.Equal("A run finished.", push.Sent.Last().Body, "generic body");
                            }
                        }
                    }
                }),
                Cases.Async(suite, "DispatchGates", "No push when Push.Enabled is false or mobile.access is disabled, and deleting a user removes their devices", async (CancellationToken token) =>
                {
                    await using (ServerFixture f = await ServerFixture.StartAsync(token).ConfigureAwait(false))
                    {
                        FakePushSender push = new FakePushSender();
                        f.Server.Devices.Sender = push;
                        await f.CreateVerifiedUserAsync("zed@example.com", "zed password 123", token).ConfigureAwait(false);
                        EnrollResponse enrolled = await f.EnrollAsync("zed@example.com", "zed password 123", "laptop", token).ConfigureAwait(false);
                        LoginResponse zed = await f.MobileLoginAsync("zed@example.com", "zed password 123", token).ConfigureAwait(false);
                        using (HttpClient z = f.BearerClient(zed.AccessToken))
                        {
                            await z.PostAsync("/v1.0/api/devices", ServerFixture.Json(new DeviceRegisterRequest { ExpoPushToken = "ExponentPushToken[zed]", Platform = "ios" }), token).ConfigureAwait(false);
                        }

                        Machine machine = (await f.Server.Database.Machines.ReadAsync(enrolled.MachineId, token).ConfigureAwait(false))!;
                        MachineStatusPayload approval = new MachineStatusPayload { Kind = MachineStatusKinds.ApprovalRequested, SessionId = "s", RunId = "r" };
                        f.Settings.Push.Enabled = false;
                        TestAssert.Equal(0, await f.Server.Devices.NotifyAsync(machine, approval, token).ConfigureAwait(false), "disabled by setting");
                        f.Settings.Push.Enabled = true;
                        await f.Server.Database.EntitlementOverrides.CreateAsync(new EntitlementOverride { AccountId = zed.User.AccountId, FeatureKey = Constants.FeatureMobileAccess, LimitValue = 0 }, token).ConfigureAwait(false);
                        f.Server.Entitlements.Invalidate(zed.User.AccountId);
                        TestAssert.Equal(0, await f.Server.Devices.NotifyAsync(machine, approval, token).ConfigureAwait(false), "gated on mobile.access");
                        TestAssert.Equal(0, push.Sent.Count, "nothing sent");
                        User user = (await f.Server.Database.Users.ReadAsync(zed.User.Id, token).ConfigureAwait(false))!;
                        await f.Server.Accounts.DeleteUserAsync(user, f.Server.Machines, token).ConfigureAwait(false);
                        TestAssert.Equal(0, (await f.Server.Database.Devices.ListForUserAsync(user.TenantId, user.Id, token).ConfigureAwait(false)).Count, "devices deleted with the user");
                    }
                })
            });
        }

        #endregion

        #region Private-Methods

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
