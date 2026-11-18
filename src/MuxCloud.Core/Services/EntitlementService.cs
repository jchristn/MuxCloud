namespace MuxCloud.Core.Services
{
    using System;
    using System.Collections.Concurrent;
    using System.Collections.Generic;
    using System.Linq;
    using System.Threading;
    using System.Threading.Tasks;
    using MuxCloud.Core.Database;
    using MuxCloud.Core.Enums;
    using MuxCloud.Core.Exceptions;
    using MuxCloud.Core.Models;

    /// <summary>
    /// Computes the features in effect for an account: every granting subscription's plan features (the most generous value
    /// wins; null is unlimited) with unexpired admin overrides applied on top. Code checks features by key, never plan names.
    /// Results are cached briefly and invalidated on change.
    /// Thread safety: safe to call concurrently.
    /// </summary>
    public class EntitlementService
    {
        #region Public-Members

        /// <summary>
        /// Cache lifetime. Default 30 seconds.
        /// </summary>
        public TimeSpan CacheLifetime { get; init; } = TimeSpan.FromSeconds(30);

        /// <summary>
        /// Raised with the account identifier when an account's entitlements are invalidated.
        /// </summary>
        public event EventHandler<string>? Changed;

        #endregion

        #region Private-Members

        private readonly DatabaseDriverBase _Db;
        private readonly ConcurrentDictionary<string, CachedEntitlements> _Cache = new ConcurrentDictionary<string, CachedEntitlements>(StringComparer.Ordinal);

        #endregion

        #region Constructors-and-Factories

        /// <summary>
        /// Instantiate.
        /// </summary>
        /// <param name="db">Database.</param>
        /// <exception cref="ArgumentNullException">db is null.</exception>
        public EntitlementService(DatabaseDriverBase db)
        {
            ArgumentNullException.ThrowIfNull(db);
            _Db = db;
        }

        #endregion

        #region Public-Methods

        /// <summary>
        /// Effective entitlements for an account.
        /// </summary>
        /// <param name="accountId">Account.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Entitlements.</returns>
        public async Task<EffectiveEntitlements> GetAsync(string accountId, CancellationToken token = default)
        {
            if (_Cache.TryGetValue(accountId, out CachedEntitlements? cached) && cached.ExpiresUtc > DateTime.UtcNow) return cached.Value;
            EffectiveEntitlements computed = await ComputeAsync(accountId, token).ConfigureAwait(false);
            _Cache[accountId] = new CachedEntitlements { Value = computed, ExpiresUtc = DateTime.UtcNow + CacheLifetime };
            return computed;
        }

        /// <summary>
        /// Drop the cached value for an account and raise <see cref="Changed"/>.
        /// </summary>
        /// <param name="accountId">Account.</param>
        public void Invalidate(string accountId)
        {
            _Cache.TryRemove(accountId, out _);
            Changed?.Invoke(this, accountId);
        }

        /// <summary>
        /// Drop every cached value (after a plan change).
        /// </summary>
        public void InvalidateAll()
        {
            List<string> keys = _Cache.Keys.ToList();
            _Cache.Clear();
            foreach (string key in keys) Changed?.Invoke(this, key);
        }

        /// <summary>
        /// Require a feature to be enabled.
        /// </summary>
        /// <param name="accountId">Account.</param>
        /// <param name="featureKey">Feature key.</param>
        /// <param name="token">Cancellation token.</param>
        /// <returns>Task.</returns>
        /// <exception cref="ApiException">402 EntitlementExceeded when the feature is disabled.</exception>
        public async Task RequireAsync(string accountId, string featureKey, CancellationToken token = default)
        {
            EffectiveEntitlements entitlements = await GetAsync(accountId, token).ConfigureAwait(false);
            if (!IsEnabled(entitlements, featureKey)) throw new ApiException(402, "EntitlementExceeded", "Your plan does not include " + featureKey + ".");
        }

        /// <summary>
        /// Whether a feature is enabled.
        /// </summary>
        /// <param name="entitlements">Entitlements.</param>
        /// <param name="featureKey">Feature key.</param>
        /// <returns>True when enabled.</returns>
        public static bool IsEnabled(EffectiveEntitlements entitlements, string featureKey)
        {
            EntitlementFeature? feature = entitlements?.Features.FirstOrDefault(f => f.Key == featureKey);
            return feature != null && feature.Enabled;
        }

        /// <summary>
        /// A feature's limit.
        /// </summary>
        /// <param name="entitlements">Entitlements.</param>
        /// <param name="featureKey">Feature key.</param>
        /// <returns>Limit; null is unlimited; 0 when disabled or unknown.</returns>
        public static long? Limit(EffectiveEntitlements entitlements, string featureKey)
        {
            EntitlementFeature? feature = entitlements?.Features.FirstOrDefault(f => f.Key == featureKey);
            if (feature == null || !feature.Enabled) return 0;
            return feature.Limit;
        }

        #endregion

        #region Private-Methods

        private async Task<EffectiveEntitlements> ComputeAsync(string accountId, CancellationToken token)
        {
            Dictionary<string, long?> values = new Dictionary<string, long?>(StringComparer.Ordinal);
            HashSet<string> granted = new HashSet<string>(StringComparer.Ordinal);
            string planCode = String.Empty;
            List<Subscription> subscriptions = await _Db.Subscriptions.EnumerateForAccountAsync(accountId, token).ConfigureAwait(false);
            foreach (Subscription subscription in subscriptions)
            {
                if (subscription.Status != SubscriptionStatusEnum.Active && subscription.Status != SubscriptionStatusEnum.Trialing && subscription.Status != SubscriptionStatusEnum.PastDue) continue;
                Plan? plan = await _Db.Plans.ReadAsync(subscription.PlanId, token).ConfigureAwait(false);
                if (plan == null) continue;
                if (planCode.Length == 0) planCode = plan.Code;
                foreach (PlanFeature feature in plan.Features)
                {
                    if (!granted.Contains(feature.FeatureKey))
                    {
                        granted.Add(feature.FeatureKey);
                        values[feature.FeatureKey] = feature.LimitValue;
                        continue;
                    }

                    long? current = values[feature.FeatureKey];
                    if (current == null || feature.LimitValue == null) values[feature.FeatureKey] = null;
                    else values[feature.FeatureKey] = Math.Max(current.Value, feature.LimitValue.Value);
                }
            }

            DateTime now = DateTime.UtcNow;
            List<EntitlementOverride> overrides = await _Db.EntitlementOverrides.EnumerateForAccountAsync(accountId, token).ConfigureAwait(false);
            foreach (EntitlementOverride item in overrides)
            {
                if (item.ExpiresUtc.HasValue && item.ExpiresUtc.Value <= now) continue;
                granted.Add(item.FeatureKey);
                values[item.FeatureKey] = item.LimitValue;
            }

            EffectiveEntitlements result = new EffectiveEntitlements { AccountId = accountId, PlanCode = planCode };
            foreach (string key in Constants.FeatureKeys)
            {
                if (!granted.Contains(key))
                {
                    result.Features.Add(new EntitlementFeature { Key = key, Enabled = false, Limit = 0 });
                    continue;
                }

                long? limit = values[key];
                result.Features.Add(new EntitlementFeature { Key = key, Enabled = limit == null || limit.Value > 0, Limit = limit });
            }

            return result;
        }

        #endregion
    }
}
