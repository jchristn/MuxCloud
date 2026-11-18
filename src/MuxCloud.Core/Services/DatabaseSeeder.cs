namespace MuxCloud.Core.Services
{
    using System;
    using System.Collections.Generic;
    using System.Threading;
    using System.Threading.Tasks;
    using MuxCloud.Core.Database;
    using MuxCloud.Core.Models;
    using MuxCloud.Core.Security;
    using MuxCloud.Core.Settings;

    /// <summary>
    /// Idempotent first-boot seed: the protected system account, tenant, and administrator, and the free plan, which
    /// enables every feature. Runs on every start and only creates what is missing.
    /// Thread safety: call once at startup.
    /// </summary>
    public static class DatabaseSeeder
    {
        #region Public-Methods

        /// <summary>
        /// Seed missing records.
        /// </summary>
        /// <param name="db">Database.</param>
        /// <param name="settings">Settings.</param>
        /// <param name="log">Receives one line per created record; a generated administrator password is reported here once.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Task.</returns>
        /// <exception cref="ArgumentNullException">db or settings is null.</exception>
        public static async Task SeedAsync(DatabaseDriverBase db, MuxCloudSettings settings, Action<string>? log, CancellationToken token = default)
        {
            ArgumentNullException.ThrowIfNull(db);
            ArgumentNullException.ThrowIfNull(settings);
            Plan? free = await db.Plans.ReadByCodeAsync(Constants.FreePlanCode, token).ConfigureAwait(false);
            if (free == null)
            {
                free = new Plan { Code = Constants.FreePlanCode, Name = "Free", PriceCents = 0, Currency = "usd", BillingInterval = "month", Active = true, IsPublic = true };
                foreach (string key in Constants.FeatureKeys) free.Features.Add(new PlanFeature { FeatureKey = key, LimitValue = null });
                await db.Plans.CreateAsync(free, token).ConfigureAwait(false);
                log?.Invoke("seeded plan " + free.Code);
            }

            Tenant? tenant = await db.Tenants.ReadProtectedAsync(token).ConfigureAwait(false);
            if (tenant == null)
            {
                Account account = new Account { Name = "System", IsProtected = true };
                tenant = new Tenant { AccountId = account.Id, Name = "System", IsProtected = true };
                await db.Accounts.CreateAsync(account, token).ConfigureAwait(false);
                await db.Tenants.CreateAsync(tenant, token).ConfigureAwait(false);
                await db.Subscriptions.CreateAsync(new Subscription { AccountId = account.Id, TenantId = tenant.Id, PlanId = free.Id }, token).ConfigureAwait(false);
                log?.Invoke("seeded system tenant " + tenant.Id);
            }

            string adminEmail = AccountService.NormalizeEmail(settings.Admin.Email);
            User? admin = await db.Users.ReadByEmailAsync(adminEmail, token).ConfigureAwait(false);
            if (admin == null)
            {
                string password = settings.Admin.Password;
                bool generated = String.IsNullOrEmpty(password);
                if (generated) password = SecretHash.CreateToken(String.Empty, 20);
                PasswordHasher hasher = new PasswordHasher { Iterations = settings.Auth.PasswordIterations };
                hasher.Hash(password, out string hash, out string salt);
                admin = new User
                {
                    TenantId = tenant.Id,
                    AccountId = tenant.AccountId,
                    Email = settings.Admin.Email,
                    EmailNormalized = adminEmail,
                    FirstName = "Mux Cloud",
                    LastName = "Administrator",
                    PasswordHash = hash,
                    PasswordSalt = salt,
                    PasswordAlgorithm = Constants.PasswordAlgorithm,
                    PasswordIterations = hasher.Iterations,
                    EmailVerifiedUtc = DateTime.UtcNow,
                    IsAdmin = true,
                    IsTenantAdmin = true,
                    IsProtected = true
                };
                await db.Users.CreateAsync(admin, token).ConfigureAwait(false);
                log?.Invoke("seeded administrator " + admin.Email + (generated ? " with generated password " + password + " (shown once; change it)" : String.Empty));
            }
        }

        #endregion
    }
}
