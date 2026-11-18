import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { adminApi } from '../../api';
import { api } from '../../apiClient';
import { ConfirmModal } from '../../components/ConfirmModal';
import { DataTable, EmptyState, type Column } from '../../components/DataTable';
import { ErrorBanner } from '../../components/ErrorBanner';
import { JsonViewerModal } from '../../components/JsonViewerModal';
import { Modal } from '../../components/Modal';
import { PageHeader } from '../../components/PageHeader';
import { usePageTitle } from '../../context/PageTitleContext';
import { useToast } from '../../context/ToastContext';
import { useLocale } from '../../i18n/runtime';
import { FEATURE_KEYS } from '../../lib/entitlements';
import { formatDateTime, formatNumber } from '../../lib/format';
import type { EntitlementOverride } from '../../types';

function AddOverrideModal({
  accountId,
  onClose,
  onSaved,
}: {
  accountId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [featureKey, setFeatureKey] = useState<string>(FEATURE_KEYS[0]);
  const [limit, setLimit] = useState('');
  const [reason, setReason] = useState('');
  const [expires, setExpires] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const valid = featureKey.trim() && (limit === '' || /^\d+$/.test(limit));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      await adminApi.createOverride(api, accountId, {
        featureKey: featureKey.trim(),
        limit: limit === '' ? null : Number(limit),
        reason: reason.trim() || undefined,
        expiresUtc: expires ? new Date(expires).toISOString() : null,
      });
      onSaved();
      onClose();
    } catch (e) {
      setError(e);
      setBusy(false);
    }
  };
  return (
    <Modal
      title={t('admin.addOverride')}
      subtitle={accountId}
      onClose={onClose}
      blocking={busy}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </button>
          <button type="submit" form="override-form" className="btn btn-primary" disabled={busy || !valid}>
            {t('common.save')}
          </button>
        </>
      }
    >
      <form id="override-form" className="form-stack" onSubmit={submit}>
        {error ? <ErrorBanner error={error} /> : null}
        <div className="form-grid">
          <div className="field">
            <label htmlFor="o-key">{t('admin.featureKey')}</label>
            <input
              id="o-key"
              className="input mono"
              list="o-feature-keys"
              value={featureKey}
              onChange={(e) => setFeatureKey(e.target.value)}
            />
            <datalist id="o-feature-keys">
              {FEATURE_KEYS.map((k) => (
                <option key={k} value={k} />
              ))}
            </datalist>
          </div>
          <div className="field">
            <label htmlFor="o-limit">{t('admin.featureLimit')}</label>
            <input
              id="o-limit"
              className="input"
              inputMode="numeric"
              placeholder={t('common.unlimited')}
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
            />
            <span className="field-hint">{t('admin.featureLimitHint')}</span>
          </div>
          <div className="field">
            <label htmlFor="o-expires">{t('admin.overrideExpires')}</label>
            <input
              id="o-expires"
              className="input"
              type="datetime-local"
              value={expires}
              onChange={(e) => setExpires(e.target.value)}
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="o-reason">{t('admin.overrideReason')}</label>
          <input
            id="o-reason"
            className="input"
            value={reason}
            maxLength={200}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
      </form>
    </Modal>
  );
}

export function OverridesPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  usePageTitle(t('admin.overridesTitle'));
  const [input, setInput] = useState(params.get('accountId') ?? '');
  const [accountId, setAccountId] = useState(params.get('accountId') ?? '');
  const [rows, setRows] = useState<EntitlementOverride[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [adding, setAdding] = useState(false);
  const [remove, setRemove] = useState<EntitlementOverride | null>(null);
  const [json, setJson] = useState<EntitlementOverride | null>(null);

  const load = async (id = accountId) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      setRows((await adminApi.overrides(api, id)) ?? []);
    } catch (e) {
      setError(e);
      setRows(null);
    } finally {
      setLoading(false);
    }
  };

  const columns: Column<EntitlementOverride>[] = [
    { id: 'feature', header: t('admin.featureKey'), pinned: true, className: 'mono', render: (o) => o.featureKey },
    {
      id: 'limit',
      header: t('admin.featureLimit'),
      render: (o) =>
        o.limit === null ? t('common.unlimited') : o.limit === 0 ? t('common.disabled') : formatNumber(locale, o.limit),
    },
    { id: 'reason', header: t('admin.overrideReason'), render: (o) => o.reason ?? '' },
    {
      id: 'expires',
      header: t('admin.overrideExpires'),
      className: 'nowrap',
      render: (o) => (o.expiresUtc ? formatDateTime(locale, o.expiresUtc) : t('admin.overrideNever')),
    },
    {
      id: 'created',
      header: t('common.created'),
      className: 'nowrap',
      defaultHidden: true,
      render: (o) => formatDateTime(locale, o.createdUtc),
    },
  ];

  return (
    <div className="page">
      <PageHeader title={t('admin.overridesTitle')} subtitle={t('admin.overridesSubtitle')} />
      <form
        className="row panel"
        style={{ alignItems: 'flex-end' }}
        onSubmit={(e) => {
          e.preventDefault();
          const id = input.trim();
          setAccountId(id);
          setParams(id ? { accountId: id } : {}, { replace: true });
          void load(id);
        }}
      >
        <div className="field" style={{ flex: 1, minWidth: 220 }}>
          <label htmlFor="acct">{t('admin.accountIdLabel')}</label>
          <input
            id="acct"
            className="input mono"
            placeholder={t('admin.accountIdPlaceholder')}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={!input.trim()}>
          {t('admin.loadOverrides')}
        </button>
      </form>
      {!accountId ? (
        <p className="muted">{t('admin.overridesPrompt')}</p>
      ) : (
        <DataTable
          tableId="admin-overrides"
          columns={columns}
          rows={rows ?? []}
          rowKey={(o) => o.id}
          loading={loading}
          error={error}
          onRetry={() => void load()}
          onRefresh={() => void load()}
          onAdd={() => setAdding(true)}
          addLabel={t('admin.addOverride')}
          onRowClick={setJson}
          rowActions={(o) => [
            { label: t('common.viewJson'), icon: 'braces', onSelect: () => setJson(o) },
            {
              label: t('common.delete'),
              icon: 'trash',
              danger: true,
              separatorBefore: true,
              onSelect: () => setRemove(o),
            },
          ]}
          empty={<EmptyState title={t('admin.overridesEmpty')} />}
        />
      )}
      {adding ? (
        <AddOverrideModal
          accountId={accountId}
          onClose={() => setAdding(false)}
          onSaved={() => {
            toast.success(t('admin.overrideSaved'));
            void load();
          }}
        />
      ) : null}
      {remove ? (
        <ConfirmModal
          title={t('admin.deleteOverrideTitle')}
          body={t('admin.deleteOverrideBody', { feature: remove.featureKey })}
          confirmLabel={t('common.delete')}
          danger
          onClose={() => setRemove(null)}
          onConfirm={async () => {
            await adminApi.deleteOverride(api, accountId, remove.id);
            toast.success(t('admin.overrideDeleted'));
            await load();
          }}
        />
      ) : null}
      {json ? <JsonViewerModal title={json.featureKey} value={json} onClose={() => setJson(null)} /> : null}
    </div>
  );
}
