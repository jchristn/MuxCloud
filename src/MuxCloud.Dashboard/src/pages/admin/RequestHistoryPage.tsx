import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { requestHistoryApi } from '../../api';
import { api } from '../../apiClient';
import { ActivityChart, ChartHeader } from '../../components/ActivityChart';
import { MethodBadge, StatusCodeBadge } from '../../components/Badges';
import { ConfirmModal } from '../../components/ConfirmModal';
import { DataTable, EmptyState, type Column } from '../../components/DataTable';
import { Icon } from '../../components/Icon';
import { JsonViewerModal } from '../../components/JsonViewerModal';
import { Kpi } from '../../components/Kpi';
import { PageHeader } from '../../components/PageHeader';
import { usePageTitle } from '../../context/PageTitleContext';
import { useToast } from '../../context/ToastContext';
import { useDebounced } from '../../hooks/useDebounced';
import { usePaged } from '../../hooks/usePaged';
import { useLocale } from '../../i18n/runtime';
import { rangeToParams, type RangeId } from '../../lib/activityRange';
import {
  formatBytes,
  formatDateTime,
  formatDuration,
  formatList,
  formatNumber,
  formatPercent,
  formatRelativeTime,
} from '../../lib/format';
import type { RequestHistoryEntry, RequestHistoryQuery, RequestHistorySummary } from '../../types';
import { RequestDetailsModal } from './RequestDetailsModal';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'];

function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    d.getFullYear() +
    '-' +
    pad(d.getMonth() + 1) +
    '-' +
    pad(d.getDate()) +
    'T' +
    pad(d.getHours()) +
    ':' +
    pad(d.getMinutes())
  );
}

function fromLocalInput(value: string): string | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

export function RequestHistoryPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const toast = useToast();
  const [params] = useSearchParams();
  usePageTitle(t('requests.title'));

  const [method, setMethod] = useState('');
  const [status, setStatus] = useState('');
  const [path, setPath] = useState('');
  const [userId, setUserId] = useState('');
  const [from, setFrom] = useState(toLocalInput(params.get('fromUtc')));
  const [to, setTo] = useState(toLocalInput(params.get('toUtc')));
  const [rangeId, setRangeId] = useState<RangeId>('day');
  const [rangeParams, setRangeParams] = useState(() => rangeToParams('day'));
  const [summary, setSummary] = useState<RequestHistorySummary | null>(null);
  const [summaryError, setSummaryError] = useState<unknown>(null);
  const [view, setView] = useState<RequestHistoryEntry | null>(null);
  const [json, setJson] = useState<RequestHistoryEntry | null>(null);
  const [remove, setRemove] = useState<RequestHistoryEntry | null>(null);
  const [removeMatching, setRemoveMatching] = useState(false);

  const debouncedPath = useDebounced(path.trim());
  const debouncedUser = useDebounced(userId.trim());
  const statusCode = /^\d{3}$/.test(status.trim()) ? Number(status.trim()) : undefined;
  const filters: Omit<RequestHistoryQuery, 'pageNumber' | 'pageSize'> = useMemo(
    () => ({
      method: method || undefined,
      statusCode,
      pathContains: debouncedPath || undefined,
      userId: debouncedUser || undefined,
      fromUtc: fromLocalInput(from),
      toUtc: fromLocalInput(to),
    }),
    [method, statusCode, debouncedPath, debouncedUser, from, to],
  );
  const filterKey = JSON.stringify(filters);

  const { data, loading, error, reload, paging } = usePaged<RequestHistoryEntry>(
    'requests',
    (pageNumber, pageSize) => requestHistoryApi.list(api, { ...filters, pageNumber, pageSize }),
    filterKey,
  );

  const loadSummary = useCallback(async (id: RangeId) => {
    const p = rangeToParams(id);
    setRangeParams(p);
    setSummaryError(null);
    try {
      setSummary(await requestHistoryApi.summary(api, p.fromUtc, p.toUtc, p.bucketMinutes));
    } catch (e) {
      setSummary(null);
      setSummaryError(e);
    }
  }, []);

  useEffect(() => {
    void loadSummary(rangeId);
  }, [rangeId, loadSummary]);

  const filterText = () => {
    const parts: string[] = [];
    if (filters.method) parts.push(t('requests.method') + '=' + filters.method);
    if (filters.statusCode) parts.push(t('requests.statusCode') + '=' + filters.statusCode);
    if (filters.pathContains) parts.push(t('requests.pathContains') + ' "' + filters.pathContains + '"');
    if (filters.userId) parts.push(t('requests.userId') + '=' + filters.userId);
    if (filters.fromUtc) parts.push(t('requests.from') + ' ' + formatDateTime(locale, filters.fromUtc));
    if (filters.toUtc) parts.push(t('requests.to') + ' ' + formatDateTime(locale, filters.toUtc));
    return parts;
  };

  const anyFilter = filterText().length > 0;
  const total = summary?.totalCount ?? 0;

  const columns: Column<RequestHistoryEntry>[] = [
    {
      id: 'when',
      mobile: 'meta',
      header: t('requests.colWhen'),
      pinned: true,
      className: 'nowrap',
      render: (r) => (
        <span title={formatDateTime(locale, r.createdUtc)}>{formatRelativeTime(locale, r.createdUtc)}</span>
      ),
    },
    {
      id: 'method',
      mobile: 'badge',
      header: t('requests.colMethod'),
      pinned: true,
      render: (r) => <MethodBadge method={r.method} />,
    },
    {
      id: 'path',
      mobile: 'title',
      header: t('requests.colPath'),
      pinned: true,
      render: (r) => (
        <span className="mono truncate" title={r.path}>
          {r.pathTemplate && r.isRelay ? r.pathTemplate : r.path}
        </span>
      ),
    },
    {
      id: 'status',
      mobile: 'badge',
      header: t('requests.colStatus'),
      render: (r) => <StatusCodeBadge code={r.statusCode} />,
    },
    {
      id: 'duration',
      mobile: 'meta',
      header: t('requests.colDuration'),
      className: 'num',
      render: (r) => formatDuration(locale, r.durationMs),
    },
    { id: 'user', header: t('requests.colUser'), className: 'mono nowrap', render: (r) => r.userId ?? '' },
    {
      id: 'size',
      header: t('requests.colSize'),
      className: 'num',
      defaultHidden: true,
      render: (r) => formatBytes(locale, r.responseBytes ?? 0),
    },
    {
      id: 'relay',
      header: t('requests.colRelay'),
      render: (r) => (r.isRelay ? <span className="pill pill-info">{t('requests.relay')}</span> : ''),
    },
  ];

  return (
    <div className="page">
      <PageHeader title={t('requests.title')} subtitle={t('requests.subtitle')} />
      <div className="kpis">
        <Kpi label={t('requests.kpiTotal')} value={formatNumber(locale, total)} />
        <Kpi
          label={t('requests.kpiFailures')}
          value={formatNumber(locale, summary?.totalFailure ?? 0)}
          tone={summary?.totalFailure ? 'danger' : undefined}
        />
        <Kpi
          label={t('requests.kpiSuccessRate')}
          value={total ? formatPercent(locale, (summary?.totalSuccess ?? 0) / total) : '-'}
        />
        <Kpi label={t('requests.kpiAvgDuration')} value={formatDuration(locale, summary?.averageDurationMs ?? 0)} />
      </div>
      <section className="section panel">
        <ChartHeader rangeId={rangeId} onRange={setRangeId} onRefresh={() => void loadSummary(rangeId)} />
        {summaryError ? <p className="small muted">{t('requests.unavailable')}</p> : null}
        <ActivityChart
          height={400}
          summary={summary}
          params={rangeParams}
          rangeId={rangeId}
          onBucketClick={(b) => {
            setFrom(toLocalInput(b.bucketStartUtc));
            setTo(toLocalInput(b.bucketEndUtc));
          }}
        />
      </section>
      <DataTable
        tableId="requests"
        caption={t('requests.title')}
        columns={columns}
        rows={data?.items ?? []}
        rowKey={(r) => r.id}
        loading={loading}
        error={error}
        onRetry={reload}
        onRefresh={reload}
        paging={paging}
        onRowClick={setView}
        toolbarExtra={
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setRemoveMatching(true)}
            disabled={!data?.totalCount}
          >
            <Icon name="trash" size={15} />
            {t('requests.deleteMatching')}
          </button>
        }
        rowActions={(r) => [
          { label: t('common.view'), icon: 'eye', onSelect: () => setView(r) },
          { label: t('common.viewJson'), icon: 'braces', onSelect: () => setJson(r) },
          {
            label: t('requests.deleteEntry'),
            icon: 'trash',
            danger: true,
            separatorBefore: true,
            onSelect: () => setRemove(r),
          },
        ]}
        filters={
          <>
            <div className="field">
              <label htmlFor="rh-method">{t('requests.method')}</label>
              <select id="rh-method" className="select" value={method} onChange={(e) => setMethod(e.target.value)}>
                <option value="">{t('common.any')}</option>
                {METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div className="field" style={{ minWidth: 110 }}>
              <label htmlFor="rh-status">{t('requests.statusCode')}</label>
              <input
                id="rh-status"
                className="input"
                style={{ minWidth: 90 }}
                inputMode="numeric"
                placeholder="500"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="rh-path">{t('requests.pathContains')}</label>
              <input
                id="rh-path"
                className="input"
                placeholder="/v1.0/api/"
                value={path}
                onChange={(e) => setPath(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="rh-user">{t('requests.userId')}</label>
              <input
                id="rh-user"
                className="input"
                placeholder="usr_"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="rh-from">{t('requests.from')}</label>
              <input
                id="rh-from"
                className="input"
                type="datetime-local"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="rh-to">{t('requests.to')}</label>
              <input
                id="rh-to"
                className="input"
                type="datetime-local"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => {
                setMethod('');
                setStatus('');
                setPath('');
                setUserId('');
                setFrom('');
                setTo('');
              }}
              disabled={!anyFilter && !status && !path && !userId}
            >
              {t('common.clear')}
            </button>
          </>
        }
        empty={
          anyFilter ? (
            <EmptyState title={t('requests.emptyFiltered')} />
          ) : (
            <EmptyState title={t('requests.emptyRetained')} />
          )
        }
      />
      {view ? <RequestDetailsModal entry={view} onClose={() => setView(null)} /> : null}
      {json ? <JsonViewerModal value={json} onClose={() => setJson(null)} /> : null}
      {remove ? (
        <ConfirmModal
          title={t('requests.deleteEntryTitle')}
          body={t('requests.deleteEntryBody')}
          confirmLabel={t('common.delete')}
          danger
          onClose={() => setRemove(null)}
          onConfirm={async () => {
            await requestHistoryApi.remove(api, remove.id);
            await reload();
          }}
        />
      ) : null}
      {removeMatching ? (
        <ConfirmModal
          title={t('requests.deleteMatchingTitle', { count: formatNumber(locale, data?.totalCount ?? 0) })}
          body={
            anyFilter
              ? t('requests.deleteMatchingBody', { filters: formatList(locale, filterText()) })
              : t('requests.deleteMatchingNoFilter')
          }
          confirmLabel={t('common.delete')}
          danger
          onClose={() => setRemoveMatching(false)}
          onConfirm={async () => {
            const result = await requestHistoryApi.removeMatching(api, filters);
            toast.success(t('requests.deletedCount', { count: formatNumber(locale, result?.deletedCount ?? 0) }));
            await reload();
            await loadSummary(rangeId);
          }}
        />
      ) : null}
    </div>
  );
}
