import type { Entitlements, Plan } from '../types';

/** Whether a feature is enabled (unknown keys are disabled). */
export function hasFeature(entitlements: Entitlements | null | undefined, key: string): boolean {
  return entitlements?.features.some((f) => f.key === key && f.enabled && f.limit !== 0) ?? false;
}

/** The numeric cap for a feature, null for unlimited, 0 when disabled or absent. */
export function featureLimit(entitlements: Entitlements | null | undefined, key: string): number | null {
  const feature = entitlements?.features.find((f) => f.key === key);
  if (!feature || !feature.enabled) return 0;
  return feature.limit;
}

/** Feature keys the dashboard knows how to describe. */
export const FEATURE_KEYS = ['web.access', 'mobile.access', 'machines.max', 'relay.concurrentStreams.max'] as const;

/** Whether the billing provider is configured: a subscription with a real provider name. */
export function billingProviderConfigured(provider: string | null | undefined): boolean {
  return !!provider && provider.toLowerCase() !== 'none';
}

export function planFeatureLimit(plan: Plan, key: string): number | null | undefined {
  return plan.features.find((f) => f.key === key)?.limit;
}
