import type { ApiClient } from './client';
import type { Entitlements, Plan, Subscription, UrlResponse } from '../types';

const base = '/v1.0/api/billing';

/** Billing routes (REST_API.md "Billing"). Checkout and portal return 501 NotImplemented until a provider exists. */
export const billingApi = {
  plans: (c: ApiClient) => c.get<Plan[]>(base + '/plans'),
  subscription: (c: ApiClient) => c.get<Subscription | null>(base + '/subscription'),
  entitlements: (c: ApiClient) => c.get<Entitlements>(base + '/entitlements'),
  checkout: (c: ApiClient, planCode: string) => c.post<UrlResponse>(base + '/checkout', { planCode }),
  portal: (c: ApiClient) => c.post<UrlResponse>(base + '/portal', {}),
};
