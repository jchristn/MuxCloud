import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { billingApi } from '../../api';
import { api } from '../../apiClient';
import { Banner } from '../../components/Banner';
import { ErrorBanner } from '../../components/ErrorBanner';
import { PageHeader } from '../../components/PageHeader';
import { Loading } from '../../components/Spinner';
import { useAuth } from '../../context/AuthContext';
import { usePageTitle } from '../../context/PageTitleContext';
import { useToast } from '../../context/ToastContext';
import { useLocale } from '../../i18n/runtime';
import { billingProviderConfigured } from '../../lib/entitlements';
import { formatCurrency, formatDate, formatNumber } from '../../lib/format';
import type { Entitlements, Plan, Subscription } from '../../types';

function featureName(t: (key: string) => string, key: string): string {
  const translated = t('features.' + key);
  return translated === 'features.' + key ? key : translated;
}

export function BillingPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const toast = useToast();
  const { setEntitlements } = useAuth();
  usePageTitle(t('pageTitles.billing'));
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [entitlements, setLocalEntitlements] = useState<Entitlements | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sub, ent, list] = await Promise.all([
        billingApi.subscription(api),
        billingApi.entitlements(api),
        billingApi.plans(api),
      ]);
      setSubscription(sub);
      setLocalEntitlements(ent);
      setEntitlements(ent);
      setPlans(list ?? []);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [setEntitlements]);

  useEffect(() => {
    void load();
  }, [load]);

  const providerReady = billingProviderConfigured(subscription?.provider);
  const intervalLabel = (interval: string) =>
    interval === 'year' ? t('billing.intervalYear') : interval === 'month' ? t('billing.intervalMonth') : interval;
  const statusLabel = (status: string) => t('billing.status' + status);
  const limitText = (limit: number | null, enabled = true) =>
    !enabled || limit === 0
      ? t('common.disabled')
      : limit === null
        ? t('common.unlimited')
        : formatNumber(locale, limit);

  const redirect = async (call: () => Promise<{ url: string }>) => {
    try {
      const { url } = await call();
      window.location.assign(url);
    } catch (e) {
      toast.error(e);
    }
  };

  if (loading && !entitlements) return <Loading />;

  return (
    <div className="page">
      <PageHeader title={t('billing.title')} subtitle={t('billing.subtitle')} />
      {error ? <ErrorBanner error={error} onRetry={load} /> : null}
      {!providerReady ? <Banner tone="info">{t('billing.notConfigured')}</Banner> : null}
      <section className="section panel">
        <h2 className="section-title">{t('billing.currentPlan')}</h2>
        {subscription ? (
          <dl className="kv">
            <dt>{t('billing.currentPlan')}</dt>
            <dd>
              <strong>{plans.find((p) => p.code === subscription.planCode)?.name ?? subscription.planCode}</strong>
            </dd>
            <dt>{t('billing.status')}</dt>
            <dd>
              <span className="row">
                <span
                  className={
                    'pill ' +
                    (subscription.status === 'Active' || subscription.status === 'Trialing'
                      ? 'pill-success'
                      : 'pill-warning')
                  }
                >
                  {statusLabel(subscription.status)}
                </span>
                {subscription.currentPeriodEndUtc ? (
                  <span className="small muted">
                    {t(subscription.cancelAtPeriodEnd ? 'billing.endsAt' : 'billing.renews', {
                      date: formatDate(locale, subscription.currentPeriodEndUtc),
                    })}
                  </span>
                ) : null}
              </span>
            </dd>
            <dt>{t('billing.provider')}</dt>
            <dd>{subscription.provider}</dd>
          </dl>
        ) : (
          <p className="muted">{t('billing.noSubscription')}</p>
        )}
        {providerReady ? (
          <div>
            <button type="button" className="btn" onClick={() => redirect(() => billingApi.portal(api))}>
              {t('billing.manageBilling')}
            </button>
          </div>
        ) : null}
      </section>
      <section className="section">
        <h2 className="section-title">{t('billing.features')}</h2>
        <div className="table-frame">
          <div className="table-scroll">
            <table className="data">
              <thead>
                <tr>
                  <th>{t('billing.feature')}</th>
                  <th>{t('common.status')}</th>
                  <th>{t('billing.limit')}</th>
                </tr>
              </thead>
              <tbody>
                {(entitlements?.features ?? []).map((f) => (
                  <tr key={f.key}>
                    <td>
                      <div className="cell-title">{featureName(t, f.key)}</div>
                      <div className="cell-sub mono">{f.key}</div>
                    </td>
                    <td>
                      <span className={'pill ' + (f.enabled && f.limit !== 0 ? 'pill-success' : '')}>
                        {f.enabled && f.limit !== 0 ? t('common.enabled') : t('common.disabled')}
                      </span>
                    </td>
                    <td>{f.key.endsWith('.access') ? '' : limitText(f.limit, f.enabled)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      {plans.length > 0 ? (
        <section className="section">
          <h2 className="section-title">{t('billing.plans')}</h2>
          <div className="form-grid">
            {plans.map((plan) => (
              <div key={plan.id} className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="row">
                  <strong>{plan.name}</strong>
                  {entitlements?.planCode === plan.code ? (
                    <span className="pill pill-accent">{t('billing.currentPlan')}</span>
                  ) : null}
                </div>
                <div className="kpi-value">
                  {plan.priceCents === 0
                    ? t('billing.free')
                    : t('billing.perInterval', {
                        price: formatCurrency(locale, plan.priceCents, plan.currency),
                        interval: intervalLabel(plan.interval),
                      })}
                </div>
                <ul className="small" style={{ margin: 0, paddingInlineStart: 18 }}>
                  {plan.features.map((f) => (
                    <li key={f.key}>
                      {featureName(t, f.key)}
                      {f.key.endsWith('.access') ? '' : ': ' + limitText(f.limit)}
                    </li>
                  ))}
                </ul>
                {providerReady && entitlements?.planCode !== plan.code ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => redirect(() => billingApi.checkout(api, plan.code))}
                  >
                    {t('billing.choosePlan')}
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
