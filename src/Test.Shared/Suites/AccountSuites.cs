namespace Test.Shared.Suites
{
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Threading;
    using System.Threading.Tasks;
    using MuxCloud.Core;
    using MuxCloud.Core.Exceptions;
    using MuxCloud.Core.Models;
    using MuxCloud.Core.Requests;
    using MuxCloud.Core.Services;
    using Touchstone.Core;

    /// <summary>
    /// Account, session, entitlement, and machine services on the selected engine.
    /// </summary>
    public static class AccountSuites
    {
        #region Public-Methods

        /// <summary>
        /// Account service suite.
        /// </summary>
        /// <returns>Suite.</returns>
        public static TestSuiteDescriptor Accounts()
        {
            const string suite = "Accounts";
            return new TestSuiteDescriptor(suite, "Accounts and sessions", new List<TestCaseDescriptor>
            {
                Cases.Async(suite, "SignupVerifyLogin", "Signup needs verification, then login issues tokens that validate", async (CancellationToken token) =>
                {
                    using (CoreFixture f = await CoreFixture.CreateAsync(token).ConfigureAwait(false))
                    {
                        User user = await f.Accounts.SignupAsync(new SignupRequest { Email = "Ada@Example.com", Password = "correct horse battery", AcceptTerms = true }, "203.0.113.1", token).ConfigureAwait(false);
                        TestAssert.True(user.EmailVerifiedUtc == null, "unverified");
                        ApiException? blocked = await Catch(() => f.Accounts.LoginAsync(new LoginRequest { Email = "ada@example.com", Password = "correct horse battery" }, "1.1.1.1", "ua", token)).ConfigureAwait(false);
                        TestAssert.Equal("EmailNotVerified", blocked?.ErrorCode, "unverified login refused");
                        await f.Accounts.VerifyEmailAsync(RecordingNotifier.TokenFrom(f.Notifier.LastVerificationLink), token).ConfigureAwait(false);
                        LoginResult login = await f.Accounts.LoginAsync(new LoginRequest { Email = " ADA@example.com ", Password = "correct horse battery", Client = "mobile" }, "1.1.1.1", "ua", token).ConfigureAwait(false);
                        TestAssert.True(login.AccessToken.StartsWith(Constants.AccessTokenPrefix, StringComparison.Ordinal), "access token prefix");
                        TestAssert.Equal("mobile", login.Session.Client, "client");
                        AuthenticatedPrincipal? principal = await f.Accounts.ValidateAccessTokenAsync(login.AccessToken, token).ConfigureAwait(false);
                        TestAssert.True(principal != null && principal.User.Id == user.Id, "token validates");
                        TestAssert.True(await f.Accounts.ValidateAccessTokenAsync(login.AccessToken + "x", token).ConfigureAwait(false) == null, "tampered token rejected");
                        EffectiveEntitlements ent = await f.Entitlements.GetAsync(user.AccountId, token).ConfigureAwait(false);
                        TestAssert.Equal("free", ent.PlanCode, "free plan");
                        TestAssert.True(ent.Features.All(x => x.Enabled && x.Limit == null), "everything enabled");
                        ApiException? dup = await Catch(() => f.Accounts.SignupAsync(new SignupRequest { Email = "ada@EXAMPLE.com", Password = "correct horse battery", AcceptTerms = true }, "1.1.1.1", token)).ConfigureAwait(false);
                        TestAssert.Equal("EmailInUse", dup?.ErrorCode, "duplicate email");
                    }
                }),
                Cases.Async(suite, "SignupValidation", "Signup rejects bad email, short password, and missing terms", async (CancellationToken token) =>
                {
                    using (CoreFixture f = await CoreFixture.CreateAsync(token).ConfigureAwait(false))
                    {
                        TestAssert.Equal(400, (await Catch(() => f.Accounts.SignupAsync(new SignupRequest { Email = "not-an-email", Password = "long enough pw", AcceptTerms = true }, "ip", token)).ConfigureAwait(false))?.StatusCode, "bad email");
                        TestAssert.Equal(400, (await Catch(() => f.Accounts.SignupAsync(new SignupRequest { Email = "a@b.co", Password = "short", AcceptTerms = true }, "ip", token)).ConfigureAwait(false))?.StatusCode, "short password");
                        TestAssert.Equal(400, (await Catch(() => f.Accounts.SignupAsync(new SignupRequest { Email = "a@b.co", Password = "long enough pw", AcceptTerms = false }, "ip", token)).ConfigureAwait(false))?.StatusCode, "terms");
                    }
                }),
                Cases.Async(suite, "RefreshRotationAndReuse", "Refresh rotates, and replaying an old refresh token revokes the session", async (CancellationToken token) =>
                {
                    using (CoreFixture f = await CoreFixture.CreateAsync(token).ConfigureAwait(false))
                    {
                        LoginResult first = await f.Accounts.LoginAsync(new LoginRequest { Email = TestSettings.AdminEmail, Password = TestSettings.AdminPassword }, "ip", "ua", token).ConfigureAwait(false);
                        LoginResult second = await f.Accounts.RefreshAsync(first.RefreshToken, "ip", token).ConfigureAwait(false);
                        TestAssert.True(second.RefreshToken != first.RefreshToken, "rotated");
                        TestAssert.True(await f.Accounts.ValidateAccessTokenAsync(second.AccessToken, token).ConfigureAwait(false) != null, "new access token works");
                        ApiException? reuse = await Catch(() => f.Accounts.RefreshAsync(first.RefreshToken, "ip", token)).ConfigureAwait(false);
                        TestAssert.Equal(401, reuse?.StatusCode, "old refresh refused");
                        TestAssert.True(await f.Accounts.ValidateAccessTokenAsync(second.AccessToken, token).ConfigureAwait(false) == null, "session revoked after reuse");
                        TestAssert.Equal(401, (await Catch(() => f.Accounts.RefreshAsync(second.RefreshToken, "ip", token)).ConfigureAwait(false))?.StatusCode, "current refresh also dead");
                    }
                }),
                Cases.Async(suite, "Lockout", "Repeated wrong passwords lock the email with 429", async (CancellationToken token) =>
                {
                    using (CoreFixture f = await CoreFixture.CreateAsync(token).ConfigureAwait(false))
                    {
                        for (int i = 0; i < f.Settings.Auth.MaxLoginFailures; i++)
                        {
                            TestAssert.Equal("InvalidCredentials", (await Catch(() => f.Accounts.LoginAsync(new LoginRequest { Email = TestSettings.AdminEmail, Password = "wrong password" }, "ip", "ua", token)).ConfigureAwait(false))?.ErrorCode, "attempt " + i);
                        }

                        ApiException? locked = await Catch(() => f.Accounts.LoginAsync(new LoginRequest { Email = TestSettings.AdminEmail, Password = TestSettings.AdminPassword }, "ip", "ua", token)).ConfigureAwait(false);
                        TestAssert.Equal(429, locked?.StatusCode, "locked even with the right password");
                        TestAssert.True(locked!.RetryAfterSeconds > 0, "retry after");
                    }
                }),
                Cases.Async(suite, "PasswordReset", "Reset works once, revokes sessions, and the new password signs in", async (CancellationToken token) =>
                {
                    using (CoreFixture f = await CoreFixture.CreateAsync(token).ConfigureAwait(false))
                    {
                        LoginResult before = await f.Accounts.LoginAsync(new LoginRequest { Email = TestSettings.AdminEmail, Password = TestSettings.AdminPassword }, "ip", "ua", token).ConfigureAwait(false);
                        await f.Accounts.ForgotPasswordAsync(TestSettings.AdminEmail, "ip", token).ConfigureAwait(false);
                        await f.Accounts.ForgotPasswordAsync("nobody@example.com", "ip", token).ConfigureAwait(false);
                        string resetToken = RecordingNotifier.TokenFrom(f.Notifier.LastResetLink);
                        await f.Accounts.ResetPasswordAsync(resetToken, "brand new password", token).ConfigureAwait(false);
                        TestAssert.Equal(400, (await Catch(() => f.Accounts.ResetPasswordAsync(resetToken, "another password!", token)).ConfigureAwait(false))?.StatusCode, "single use");
                        TestAssert.True(await f.Accounts.ValidateAccessTokenAsync(before.AccessToken, token).ConfigureAwait(false) == null, "old session revoked");
                        await f.Accounts.LoginAsync(new LoginRequest { Email = TestSettings.AdminEmail, Password = "brand new password" }, "ip", "ua", token).ConfigureAwait(false);
                        TestAssert.True(f.Notifier.Sent.Any(x => x.StartsWith("password-changed|", StringComparison.Ordinal)), "password changed notice");
                    }
                }),
                Cases.Async(suite, "EntitlementOverrides", "Overrides cap a feature and expired overrides are ignored", async (CancellationToken token) =>
                {
                    using (CoreFixture f = await CoreFixture.CreateAsync(token).ConfigureAwait(false))
                    {
                        User admin = (await f.Db.Users.ReadByEmailAsync(TestSettings.AdminEmail, token).ConfigureAwait(false))!;
                        await f.Db.EntitlementOverrides.CreateAsync(new EntitlementOverride { AccountId = admin.AccountId, FeatureKey = Constants.FeatureMachinesMax, LimitValue = 1 }, token).ConfigureAwait(false);
                        await f.Db.EntitlementOverrides.CreateAsync(new EntitlementOverride { AccountId = admin.AccountId, FeatureKey = Constants.FeatureMobileAccess, LimitValue = 0, ExpiresUtc = DateTime.UtcNow.AddMinutes(-1) }, token).ConfigureAwait(false);
                        EffectiveEntitlements ent = await f.Entitlements.GetAsync(admin.AccountId, token).ConfigureAwait(false);
                        TestAssert.Equal((long?)1, EntitlementService.Limit(ent, Constants.FeatureMachinesMax), "capped");
                        TestAssert.True(EntitlementService.IsEnabled(ent, Constants.FeatureMobileAccess), "expired override ignored");
                        EffectiveEntitlements none = await f.Entitlements.GetAsync("acct_missing", token).ConfigureAwait(false);
                        TestAssert.True(none.Features.All(x => !x.Enabled), "no subscription grants nothing");
                    }
                }),
                Cases.Async(suite, "EnrollAndRevoke", "Enrollment issues a secret, re-enrollment rotates it, the cap applies, and revoke clears it", async (CancellationToken token) =>
                {
                    using (CoreFixture f = await CoreFixture.CreateAsync(token).ConfigureAwait(false))
                    {
                        EnrollRequest request = new EnrollRequest { Email = TestSettings.AdminEmail, Password = TestSettings.AdminPassword, MachineName = "studio", Fingerprint = "0123456789abcdef0123" };
                        EnrollResult first = await f.Machines.EnrollAsync(request, "198.51.100.1", token).ConfigureAwait(false);
                        TestAssert.True(first.Secret.StartsWith("mcs_", StringComparison.Ordinal) && !first.Reenrolled, "new machine");
                        TestAssert.Equal(first.Secret, f.Machines.GetSecret(first.Machine), "secret decrypts");
                        TestAssert.True(!first.Machine.SecretEncrypted.Contains(first.Secret, StringComparison.Ordinal), "secret stored encrypted");
                        EnrollResult again = await f.Machines.EnrollAsync(request, "198.51.100.1", token).ConfigureAwait(false);
                        TestAssert.True(again.Reenrolled && again.Machine.Id == first.Machine.Id && again.Secret != first.Secret, "re-enroll rotates");
                        User admin = (await f.Db.Users.ReadByEmailAsync(TestSettings.AdminEmail, token).ConfigureAwait(false))!;
                        await f.Db.EntitlementOverrides.CreateAsync(new EntitlementOverride { AccountId = admin.AccountId, FeatureKey = Constants.FeatureMachinesMax, LimitValue = 1 }, token).ConfigureAwait(false);
                        ApiException? capped = await Catch(() => f.Machines.EnrollAsync(new EnrollRequest { Email = TestSettings.AdminEmail, Password = TestSettings.AdminPassword, MachineName = "laptop", Fingerprint = "fedcba9876543210fedc" }, "ip", token)).ConfigureAwait(false);
                        TestAssert.Equal(402, capped?.StatusCode, "machines.max");
                        TestAssert.Equal(401, (await Catch(() => f.Machines.EnrollAsync(new EnrollRequest { Email = TestSettings.AdminEmail, Password = "wrong", MachineName = "x", Fingerprint = "fedcba9876543210fedc" }, "ip", token)).ConfigureAwait(false))?.StatusCode, "bad password");
                        List<string> revokedIds = new List<string>();
                        f.Machines.MachineRevoked += (object? sender, MachineRevokedEventArgs e) => revokedIds.Add(e.MachineId);
                        Machine revoked = await f.Machines.RevokeAsync(admin, first.Machine.Id, token).ConfigureAwait(false);
                        TestAssert.True(revoked.RevokedUtc != null && f.Machines.GetSecret(revoked) == null, "revoked");
                        TestAssert.Equal(first.Machine.Id, revokedIds.SingleOrDefault(), "revoked event");
                        ApiException? other = await Catch(() => f.Machines.ReadForUserAsync(new User { Id = "usr_x", TenantId = admin.TenantId }, first.Machine.Id, token)).ConfigureAwait(false);
                        TestAssert.Equal(404, other?.StatusCode, "other user sees 404");
                    }
                })
            });
        }

        #endregion

        #region Private-Methods

        private static async Task<ApiException?> Catch(Func<Task> action)
        {
            try
            {
                await action().ConfigureAwait(false);
                return null;
            }
            catch (ApiException e)
            {
                return e;
            }
        }

        #endregion
    }
}
