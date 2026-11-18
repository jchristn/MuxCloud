import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../../api';
import { api } from '../../apiClient';
import { DataTable, EmptyState, type Column } from '../../components/DataTable';
import { JsonViewerModal } from '../../components/JsonViewerModal';
import { PageHeader } from '../../components/PageHeader';
import { usePageTitle } from '../../context/PageTitleContext';
import { useDebounced } from '../../hooks/useDebounced';
import { usePaged } from '../../hooks/usePaged';
import { useLocale } from '../../i18n/runtime';
import { formatDateTime, formatRelativeTime } from '../../lib/format';
import type { AuditRecord } from '../../types';

export function AuditPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  usePageTitle(t('admin.auditTitle'));
  const [eventType, setEventType] = useState('');
  const [userId, setUserId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [json, setJson] = useState<AuditRecord | null>(null);
  const e = useDebounced(eventType.trim());
  const u = useDebounced(userId.trim());
  const filters = useMemo(
    () => ({
      eventType: e || undefined,
      userId: u || undefined,
      fromUtc: from ? new Date(from).toISOString() : undefined,
      toUtc: to ? new Date(to).toISOString() : undefined,
    }),
    [e, u, from, to],
  );
  const { data, loading, error, reload, paging } = usePaged<AuditRecord>(
    'admin-audit',
    (pageNumber, pageSize) => adminApi.audit(api, { ...filters, pageNumber, pageSize }),
    JSON.stringify(filters),
  );

  const columns: Column<AuditRecord>[] = [
    {
      id: 'when',
      mobile: 'meta',
      header: t('admin.colWhen'),
      pinned: true,
      className: 'nowrap',
      render: (r) => (
        <span title={formatDateTime(locale, r.createdUtc)}>{formatRelativeTime(locale, r.createdUtc)}</span>
      ),
    },
    {
      id: 'event',
      mobile: 'title',
      header: t('admin.colEvent'),
      pinned: true,
      className: 'mono',
      render: (r) => r.eventType,
    },
    {
      id: 'result',
      mobile: 'badge',
      header: t('admin.colResult'),
      render: (r) =>
        r.result ? (
          <span className={'pill ' + (/fail|den/i.test(r.result) ? 'pill-danger' : 'pill-success')}>{r.result}</span>
        ) : (
          ''
        ),
    },
    { id: 'principal', mobile: 'meta', header: t('admin.colPrincipal'), render: (r) => r.principal ?? r.userId ?? '' },
    { id: 'source', header: t('admin.colSource'), className: 'mono nowrap', render: (r) => r.sourceIp ?? '' },
    { id: 'reason', header: t('admin.overrideReason'), defaultHidden: true, render: (r) => r.reason ?? '' },
  ];

  return (
    <div className="page">
      <PageHeader title={t('admin.auditTitle')} subtitle={t('admin.auditSubtitle')} />
      <DataTable
        tableId="admin-audit"
        caption={t('admin.auditTitle')}
        columns={columns}
        rows={data?.items ?? []}
        rowKey={(r) => r.id}
        loading={loading}
        error={error}
        onRetry={reload}
        onRefresh={reload}
        paging={paging}
        onRowClick={setJson}
        rowActions={(r) => [
          { label: t('common.view'), icon: 'eye', onSelect: () => setJson(r) },
          { label: t('common.viewJson'), icon: 'braces', onSelect: () => setJson(r) },
        ]}
        filters={
          <>
            <div className="field">
              <label htmlFor="a-type">{t('admin.eventType')}</label>
              <input
                id="a-type"
                className="input mono"
                placeholder="auth.login"
                value={eventType}
                onChange={(ev) => setEventType(ev.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="a-user">{t('requests.userId')}</label>
              <input
                id="a-user"
                className="input mono"
                placeholder="usr_"
                value={userId}
                onChange={(ev) => setUserId(ev.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="a-from">{t('requests.from')}</label>
              <input
                id="a-from"
                className="input"
                type="datetime-local"
                value={from}
                onChange={(ev) => setFrom(ev.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="a-to">{t('requests.to')}</label>
              <input
                id="a-to"
                className="input"
                type="datetime-local"
                value={to}
                onChange={(ev) => setTo(ev.target.value)}
              />
            </div>
          </>
        }
        empty={<EmptyState title={t('admin.auditEmpty')} />}
      />
      {json ? <JsonViewerModal title={json.eventType} value={json} onClose={() => setJson(null)} /> : null}
    </div>
  );
}
