import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../../api';
import { api } from '../../apiClient';
import { YesNo } from '../../components/Badges';
import { CopyableId } from '../../components/CopyButton';
import { DataTable, EmptyState, type Column } from '../../components/DataTable';
import { ErrorBanner } from '../../components/ErrorBanner';
import { Icon } from '../../components/Icon';
import { JsonViewerModal } from '../../components/JsonViewerModal';
import { Modal } from '../../components/Modal';
import { PageHeader } from '../../components/PageHeader';
import { usePageTitle } from '../../context/PageTitleContext';
import { useToast } from '../../context/ToastContext';
import { useLocale } from '../../i18n/runtime';
import { FEATURE_KEYS } from '../../lib/entitlements';
import { formatCurrency } from '../../lib/format';
import type { Plan, PlanRequest } from '../../types';

interface FeatureRow {
  key: string;
  limit: string;
}

function PlanModal({
  plan,
  mode,
  onClose,
  onSaved,
}: {
  plan: Plan | null;
  mode: 'create' | 'edit' | 'duplicate';
  onClose: () => void;
  onSaved: (plan: Plan) => void;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    code: mode === 'duplicate' ? (plan?.code ?? '') + '-copy' : (plan?.code ?? ''),
    name: plan?.name ?? '',
    priceCents: String(plan?.priceCents ?? 0),
    currency: plan?.currency ?? 'usd',
    interval: plan?.interval ?? 'month',
    active: plan?.active ?? true,
    public: plan?.public ?? true,
  });
  const [features, setFeatures] = useState<FeatureRow[]>(
    plan
      ? plan.features.map((f) => ({ key: f.key, limit: f.limit === null ? '' : String(f.limit) }))
      : FEATURE_KEYS.map((key) => ({ key, limit: '' })),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const price = Number(form.priceCents);
  const valid =
    /^[a-z0-9][a-z0-9-]{0,63}$/.test(form.code) &&
    form.name.trim().length > 0 &&
    Number.isInteger(price) &&
    price >= 0 &&
    features.every((f) => f.key.trim() && (f.limit === '' || /^\d+$/.test(f.limit)));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError(null);
    const body: PlanRequest = {
      code: form.code,
      name: form.name.trim(),
      priceCents: price,
      currency: form.currency.trim().toLowerCase(),
      interval: form.interval,
      active: form.active,
      public: form.public,
      features: features.map((f) => ({ key: f.key.trim(), limit: f.limit === '' ? null : Number(f.limit) })),
    };
    try {
      onSaved(
        mode === 'edit' && plan ? await adminApi.updatePlan(api, plan.id, body) : await adminApi.createPlan(api, body),
      );
      onClose();
    } catch (e) {
      setError(e);
      setBusy(false);
    }
  };

  return (
    <Modal
      title={mode === 'edit' ? t('admin.editPlan') : t('admin.newPlan')}
      subtitle={mode === 'edit' && plan ? <CopyableId value={plan.id} /> : undefined}
      size="lg"
      onClose={onClose}
      blocking={busy}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </button>
          <button type="submit" form="plan-form" className="btn btn-primary" disabled={busy || !valid}>
            {busy ? t('common.saving') : t('common.save')}
          </button>
        </>
      }
    >
      <form id="plan-form" className="form-stack" onSubmit={submit}>
        {error ? <ErrorBanner error={error} /> : null}
        <div className="form-grid">
          <div className="field">
            <label htmlFor="p-code">{t('admin.planCode')}</label>
            <input
              id="p-code"
              className="input mono"
              value={form.code}
              disabled={mode === 'edit'}
              onChange={(e) => setForm({ ...form, code: e.target.value.toLowerCase() })}
              placeholder="pro"
            />
          </div>
          <div className="field">
            <label htmlFor="p-name">{t('admin.planName')}</label>
            <input
              id="p-name"
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="p-price">{t('admin.planPrice')}</label>
            <input
              id="p-price"
              className="input"
              inputMode="numeric"
              value={form.priceCents}
              onChange={(e) => setForm({ ...form, priceCents: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="p-currency">{t('admin.planCurrency')}</label>
            <input
              id="p-currency"
              className="input"
              value={form.currency}
              maxLength={3}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="p-interval">{t('admin.planInterval')}</label>
            <select
              id="p-interval"
              className="select"
              value={form.interval}
              onChange={(e) => setForm({ ...form, interval: e.target.value })}
            >
              <option value="month">{t('billing.intervalMonth')}</option>
              <option value="year">{t('billing.intervalYear')}</option>
            </select>
          </div>
        </div>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked })}
          />
          <span>{t('admin.planActive')}</span>
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={form.public}
            onChange={(e) => setForm({ ...form, public: e.target.checked })}
          />
          <span>{t('admin.planPublic')}</span>
        </label>
        <fieldset className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <legend className="field-label">{t('admin.planFeatures')}</legend>
          <span className="field-hint">{t('admin.featureLimitHint')}</span>
          {features.map((f, i) => (
            <div key={i} className="row" style={{ alignItems: 'flex-end' }}>
              <div className="field" style={{ flex: 2, minWidth: 180 }}>
                <label htmlFor={'f-key-' + i}>{t('admin.featureKey')}</label>
                <input
                  id={'f-key-' + i}
                  className="input mono"
                  list="feature-keys"
                  value={f.key}
                  onChange={(e) => setFeatures(features.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)))}
                />
              </div>
              <div className="field" style={{ flex: 1, minWidth: 100 }}>
                <label htmlFor={'f-limit-' + i}>{t('admin.featureLimit')}</label>
                <input
                  id={'f-limit-' + i}
                  className="input"
                  inputMode="numeric"
                  placeholder={t('common.unlimited')}
                  value={f.limit}
                  onChange={(e) => setFeatures(features.map((x, j) => (j === i ? { ...x, limit: e.target.value } : x)))}
                />
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setFeatures(features.filter((_, j) => j !== i))}
                aria-label={t('admin.removeFeature')}
                title={t('admin.removeFeature')}
              >
                <Icon name="trash" />
              </button>
            </div>
          ))}
          <datalist id="feature-keys">
            {FEATURE_KEYS.map((k) => (
              <option key={k} value={k} />
            ))}
          </datalist>
          <div>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setFeatures([...features, { key: '', limit: '' }])}
            >
              <Icon name="plus" size={14} />
              {t('admin.addFeature')}
            </button>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}

export function PlansPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const toast = useToast();
  usePageTitle(t('admin.plansTitle'));
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [modal, setModal] = useState<{ plan: Plan | null; mode: 'create' | 'edit' | 'duplicate' } | null>(null);
  const [json, setJson] = useState<Plan | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPlans((await adminApi.plans(api)) ?? []);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const columns: Column<Plan>[] = [
    {
      id: 'name',
      header: t('admin.planName'),
      pinned: true,
      sortValue: (p) => p.name,
      render: (p) => <span className="cell-title">{p.name}</span>,
    },
    { id: 'code', header: t('admin.planCode'), sortValue: (p) => p.code, className: 'mono', render: (p) => p.code },
    {
      id: 'price',
      header: t('admin.colPrice'),
      sortValue: (p) => p.priceCents,
      className: 'num',
      render: (p) => formatCurrency(locale, p.priceCents, p.currency),
    },
    {
      id: 'interval',
      header: t('admin.colInterval'),
      render: (p) => (p.interval === 'year' ? t('billing.intervalYear') : t('billing.intervalMonth')),
    },
    { id: 'features', header: t('admin.colFeatures'), className: 'num', render: (p) => p.features.length },
    { id: 'active', header: t('admin.planActive'), render: (p) => <YesNo value={p.active !== false} /> },
    { id: 'public', header: t('admin.colPublic'), render: (p) => <YesNo value={p.public !== false} /> },
  ];

  return (
    <div className="page">
      <PageHeader title={t('admin.plansTitle')} subtitle={t('admin.plansSubtitle')} />
      <DataTable
        tableId="admin-plans"
        caption={t('admin.plansTitle')}
        columns={columns}
        rows={plans}
        rowKey={(p) => p.id}
        loading={loading}
        error={error}
        onRetry={load}
        onRefresh={load}
        onAdd={() => setModal({ plan: null, mode: 'create' })}
        addLabel={t('admin.addPlan')}
        onRowClick={(p) => setModal({ plan: p, mode: 'edit' })}
        rowActions={(p) => [
          { label: t('common.edit'), icon: 'edit', onSelect: () => setModal({ plan: p, mode: 'edit' }) },
          { label: t('common.duplicate'), icon: 'copy', onSelect: () => setModal({ plan: p, mode: 'duplicate' }) },
          { label: t('common.viewJson'), icon: 'braces', onSelect: () => setJson(p) },
        ]}
        empty={<EmptyState title={t('table.showingNone')} />}
      />
      {modal ? (
        <PlanModal
          plan={modal.plan}
          mode={modal.mode}
          onClose={() => setModal(null)}
          onSaved={() => {
            toast.success(t('admin.planSaved'));
            void load();
          }}
        />
      ) : null}
      {json ? <JsonViewerModal title={json.name} value={json} onClose={() => setJson(null)} /> : null}
    </div>
  );
}
