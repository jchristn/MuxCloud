namespace Test.Shared.Suites
{
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Threading;
    using System.Threading.Tasks;
    using MuxCloud.Core;
    using MuxCloud.Core.Database;
    using MuxCloud.Core.Models;
    using MuxCloud.Core.Services;
    using Touchstone.Core;

    /// <summary>
    /// Provider matrix: migrations, first boot, CRUD, tenant isolation, and concurrent writes on the selected engine.
    /// </summary>
    public static class DatabaseSuites
    {
        #region Public-Methods

        /// <summary>
        /// Database suite.
        /// </summary>
        /// <returns>Suite.</returns>
        public static TestSuiteDescriptor Database()
        {
            const string suite = "Database";
            return new TestSuiteDescriptor(suite, "Database provider (" + TestDatabase.Provider + ")", new List<TestCaseDescriptor>
            {
                Cases.Async(suite, "MigrationsIdempotent", "Migrations apply once and a second initialize applies nothing", async (CancellationToken token) =>
                {
                    DatabaseSettings settings = await TestDatabase.CreateAsync(token).ConfigureAwait(false);
                    using (DatabaseDriverBase first = await DatabaseDriverFactory.CreateAndInitializeAsync(settings, token).ConfigureAwait(false))
                    {
                        TestAssert.Equal("1", String.Join(",", first.AppliedMigrations), "first run applies version 1");
                    }

                    using (DatabaseDriverBase second = await DatabaseDriverFactory.CreateAndInitializeAsync(settings, token).ConfigureAwait(false))
                    {
                        TestAssert.Equal(0, second.AppliedMigrations.Count, "second run applies nothing");
                        long rows = await second.Executor.ScalarAsync("SELECT COUNT(*) FROM schema_migrations", null, token).ConfigureAwait(false);
                        TestAssert.Equal(1L, rows, "schema_migrations rows");
                    }
                }),
                Cases.Async(suite, "FirstBootIdempotent", "Seeding twice leaves one admin, one free plan, and one system tenant", async (CancellationToken token) =>
                {
                    using (CoreFixture f = await CoreFixture.CreateAsync(token).ConfigureAwait(false))
                    {
                        await DatabaseSeeder.SeedAsync(f.Db, f.Settings, null, token).ConfigureAwait(false);
                        User? admin = await f.Db.Users.ReadByEmailAsync(TestSettings.AdminEmail, token).ConfigureAwait(false);
                        TestAssert.True(admin != null && admin.IsAdmin && admin.IsProtected, "protected admin exists");
                        TestAssert.Equal(1L, await f.Db.Users.CountAsync(token).ConfigureAwait(false), "one user");
                        List<Plan> plans = await f.Db.Plans.EnumerateAsync(true, token).ConfigureAwait(false);
                        TestAssert.Equal(1, plans.Count, "one plan");
                        TestAssert.Equal(Constants.FeatureKeys.Count, plans[0].Features.Count, "free plan features");
                        TestAssert.True(plans[0].Features.All(x => x.LimitValue == null), "free plan is unlimited");
                        Tenant? system = await f.Db.Tenants.ReadProtectedAsync(token).ConfigureAwait(false);
                        TestAssert.True(system != null && system.Id == admin!.TenantId, "admin is in the system tenant");
                    }
                }),
                Cases.Async(suite, "UserCrud", "Users round trip every column, and email lookups are exact", async (CancellationToken token) =>
                {
                    using (CoreFixture f = await CoreFixture.CreateAsync(token).ConfigureAwait(false))
                    {
                        DateTime verified = new DateTime(2026, 11, 17, 18, 30, 15, DateTimeKind.Utc);
                        User user = new User { TenantId = "ten_a", AccountId = "acct_a", Email = "Ada@Example.com", EmailNormalized = "ada@example.com", FirstName = "Ada", PasswordHash = "h", PasswordSalt = "s", PasswordAlgorithm = "x", PasswordIterations = 7, EmailVerifiedUtc = verified };
                        await f.Db.Users.CreateAsync(user, token).ConfigureAwait(false);
                        User? back = await f.Db.Users.ReadByEmailAsync("ada@example.com", token).ConfigureAwait(false);
                        TestAssert.True(back != null, "read by email");
                        TestAssert.Equal("Ada@Example.com", back!.Email, "email kept");
                        TestAssert.Equal(7, back.PasswordIterations, "iterations");
                        TestAssert.True(back.EmailVerifiedUtc.HasValue && Math.Abs((back.EmailVerifiedUtc.Value - verified).TotalSeconds) < 1, "verified time");
                        TestAssert.Equal(DateTimeKind.Utc, back.EmailVerifiedUtc!.Value.Kind, "UTC kind");
                        TestAssert.True(back.Active && back.IsTenantAdmin && !back.IsAdmin, "booleans");
                        back.FirstName = "Augusta";
                        await f.Db.Users.UpdateAsync(back, token).ConfigureAwait(false);
                        TestAssert.Equal("Augusta", (await f.Db.Users.ReadAsync("ten_a", user.Id, token).ConfigureAwait(false))!.FirstName, "updated");
                        TestAssert.True(await f.Db.Users.ReadAsync("ten_other", user.Id, token).ConfigureAwait(false) == null, "wrong tenant reads nothing");
                        PagedResult<User> page = await f.Db.Users.EnumerateAsync("EXAMPLE", new PageRequest { PageSize = 10 }, token).ConfigureAwait(false);
                        TestAssert.Equal(1L, page.TotalCount, "case-insensitive search");
                        await f.Db.Users.DeleteAsync("ten_a", user.Id, token).ConfigureAwait(false);
                        TestAssert.True(await f.Db.Users.ReadAsync(user.Id, token).ConfigureAwait(false) == null, "deleted");
                    }
                }),
                Cases.Async(suite, "MachineTenantIsolation", "Machine reads and enumeration never cross tenants", async (CancellationToken token) =>
                {
                    using (CoreFixture f = await CoreFixture.CreateAsync(token).ConfigureAwait(false))
                    {
                        Machine a = await f.Db.Machines.CreateAsync(new Machine { TenantId = "ten_a", UserId = "usr_a", Name = "alpha", Fingerprint = "fp-a-0000000000000" }, token).ConfigureAwait(false);
                        Machine b = await f.Db.Machines.CreateAsync(new Machine { TenantId = "ten_b", UserId = "usr_b", Name = "beta", Fingerprint = "fp-b-0000000000000" }, token).ConfigureAwait(false);
                        TestAssert.True(await f.Db.Machines.ReadAsync("ten_a", b.Id, token).ConfigureAwait(false) == null, "tenant a cannot read b");
                        PagedResult<Machine> mine = await f.Db.Machines.EnumerateAsync(new MachineFilter { TenantId = "ten_a", UserId = "usr_a" }, new PageRequest(), token).ConfigureAwait(false);
                        TestAssert.Equal(1L, mine.TotalCount, "one machine for a");
                        TestAssert.Equal(a.Id, mine.Items[0].Id, "a's machine");
                        await f.Db.Machines.UpdateStatusAsync(a.Id, 2, 1, false, "2.0.0", DateTime.UtcNow, token).ConfigureAwait(false);
                        Machine? updated = await f.Db.Machines.ReadAsync(a.Id, token).ConfigureAwait(false);
                        TestAssert.True(updated!.ActiveRuns == 2 && updated.AwaitingApproval == 1 && !updated.RemoteToolApproval && updated.MuxVersion == "2.0.0", "status update");
                        TestAssert.True(await f.Db.Machines.ReadByFingerprintAsync("ten_a", "usr_a", "fp-a-0000000000000", token).ConfigureAwait(false) != null, "fingerprint lookup");
                        TestAssert.Equal(1L, await f.Db.Machines.CountActiveAsync("ten_b", "usr_b", token).ConfigureAwait(false), "count active");
                    }
                }),
                Cases.Async(suite, "SessionLookups", "Sessions are found by current and previous refresh hash, and revoke-all keeps the exception", async (CancellationToken token) =>
                {
                    using (CoreFixture f = await CoreFixture.CreateAsync(token).ConfigureAwait(false))
                    {
                        DateTime later = DateTime.UtcNow.AddDays(1);
                        AuthSession s1 = await f.Db.Sessions.CreateAsync(new AuthSession { TenantId = "t", UserId = "u", RefreshTokenHash = "h1", PreviousRefreshTokenHash = "h0", RefreshExpiresUtc = later }, token).ConfigureAwait(false);
                        AuthSession s2 = await f.Db.Sessions.CreateAsync(new AuthSession { TenantId = "t", UserId = "u", RefreshTokenHash = "h2", RefreshExpiresUtc = later }, token).ConfigureAwait(false);
                        TestAssert.Equal(s1.Id, (await f.Db.Sessions.ReadByRefreshHashAsync("h1", token).ConfigureAwait(false))!.Id, "current hash");
                        TestAssert.Equal(s1.Id, (await f.Db.Sessions.ReadByPreviousRefreshHashAsync("h0", token).ConfigureAwait(false))!.Id, "previous hash");
                        int revoked = await f.Db.Sessions.RevokeAllForUserAsync("t", "u", s2.Id, "test", DateTime.UtcNow, token).ConfigureAwait(false);
                        TestAssert.Equal(1, revoked, "one revoked");
                        PagedResult<AuthSession> active = await f.Db.Sessions.EnumerateActiveAsync("t", "u", DateTime.UtcNow, new PageRequest(), token).ConfigureAwait(false);
                        TestAssert.Equal(s2.Id, active.Items.Single().Id, "exception kept");
                    }
                }),
                Cases.Async(suite, "PlanFeaturesReplace", "Updating a plan replaces its features", async (CancellationToken token) =>
                {
                    using (CoreFixture f = await CoreFixture.CreateAsync(token).ConfigureAwait(false))
                    {
                        Plan plan = new Plan { Code = "pro", Name = "Pro", PriceCents = 900 };
                        plan.Features.Add(new PlanFeature { FeatureKey = Constants.FeatureMachinesMax, LimitValue = 10 });
                        plan.Features.Add(new PlanFeature { FeatureKey = Constants.FeatureMobileAccess, LimitValue = null });
                        await f.Db.Plans.CreateAsync(plan, token).ConfigureAwait(false);
                        Plan? back = await f.Db.Plans.ReadByCodeAsync("pro", token).ConfigureAwait(false);
                        TestAssert.Equal(2, back!.Features.Count, "two features");
                        TestAssert.Equal((long?)10, back.Features.Single(x => x.FeatureKey == Constants.FeatureMachinesMax).LimitValue, "limit kept");
                        back.Features = new List<PlanFeature> { new PlanFeature { FeatureKey = Constants.FeatureWebAccess } };
                        await f.Db.Plans.UpdateAsync(back, token).ConfigureAwait(false);
                        TestAssert.Equal(Constants.FeatureWebAccess, (await f.Db.Plans.ReadAsync(plan.Id, token).ConfigureAwait(false))!.Features.Single().FeatureKey, "replaced");
                        TestAssert.Equal(2, (await f.Db.Plans.EnumerateAsync(false, token).ConfigureAwait(false)).Count, "public plans listed by price");
                    }
                }),
                Cases.Async(suite, "RequestHistoryFilters", "Request history filters, summary rows, and filtered deletes", async (CancellationToken token) =>
                {
                    using (CoreFixture f = await CoreFixture.CreateAsync(token).ConfigureAwait(false))
                    {
                        DateTime now = DateTime.UtcNow;
                        await f.Db.RequestHistory.CreateAsync(new RequestHistoryEntry { Method = "GET", Path = "/v1.0/api/machines", StatusCode = 200, DurationMs = 2, CreatedUtc = now.AddMinutes(-2), RequestBody = "x" }, token).ConfigureAwait(false);
                        await f.Db.RequestHistory.CreateAsync(new RequestHistoryEntry { Method = "POST", Path = "/v1.0/api/auth/login", StatusCode = 401, DurationMs = 4, CreatedUtc = now.AddMinutes(-1) }, token).ConfigureAwait(false);
                        PagedResult<RequestHistoryEntry> gets = await f.Db.RequestHistory.EnumerateAsync(new RequestHistoryFilter { Method = "get" }, new PageRequest(), token).ConfigureAwait(false);
                        TestAssert.Equal(1L, gets.TotalCount, "method filter");
                        TestAssert.Equal(String.Empty, gets.Items[0].RequestBody, "list omits bodies");
                        TestAssert.Equal(1L, (await f.Db.RequestHistory.EnumerateAsync(new RequestHistoryFilter { PathContains = "LOGIN" }, new PageRequest(), token).ConfigureAwait(false)).TotalCount, "path filter");
                        TestAssert.Equal(2, (await f.Db.RequestHistory.ListRangeAsync(now.AddMinutes(-5), now.AddMinutes(1), token).ConfigureAwait(false)).Count, "range rows");
                        TestAssert.Equal(1, await f.Db.RequestHistory.DeleteByFilterAsync(new RequestHistoryFilter { StatusCode = 401 }, token).ConfigureAwait(false), "filtered delete");
                    }
                }),
                Cases.Async(suite, "ConcurrentWrites", "Fifty concurrent inserts all succeed", async (CancellationToken token) =>
                {
                    using (CoreFixture f = await CoreFixture.CreateAsync(token).ConfigureAwait(false))
                    {
                        List<Task> tasks = new List<Task>();
                        for (int i = 0; i < 50; i++)
                        {
                            int n = i;
                            tasks.Add(Task.Run(() => f.Db.Audit.CreateAsync(new AuditRecord { EventType = "test", Message = "m" + n }, token), token));
                        }

                        await Task.WhenAll(tasks).ConfigureAwait(false);
                        PagedResult<AuditRecord> page = await f.Db.Audit.EnumerateAsync(new AuditFilter { EventType = "test" }, new PageRequest { PageSize = 100 }, token).ConfigureAwait(false);
                        TestAssert.Equal(50L, page.TotalCount, "all rows");
                    }
                })
            });
        }

        #endregion
    }
}
