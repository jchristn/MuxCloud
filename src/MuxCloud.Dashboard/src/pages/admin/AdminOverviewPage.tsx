import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { adminApi, requestHistoryApi } from '../../api';
import { api } from '../../apiClient';
import { ActivityChart, ChartHeader } from '../../components/ActivityChart';
import { MethodBadge, StatusCodeBadge } from '../../components/Badges';
import { ErrorBanner } from '../../components/ErrorBanner';
import { Icon } from '../../components/Icon';
import { Kpi } from '../../components/Kpi';
import { PageHeader } from '../../components/PageHeader';
import { usePageTitle } from '../../context/PageTitleContext';
import { useLocale } from '../../i18n/runtime';
import { rangeToParams, type RangeId } from '../../lib/activityRange';
import { formatNumber, formatRelativeTime, formatTime } from '../../lib/format';
import type { AdminStats, RequestHistoryEntry, RequestHistorySummary } from '../../types';

export function AdminOverviewPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const navigate = useNavigate();
  usePageTitle(t('admin.overviewTitle'));
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsError, setStatsError] = useState<unknown>(null);
  const [rangeId, setRangeId] = useState<RangeId>('day');
  const [params, setParams] = useState(() => rangeToParams('day'));
  const [summary, setSummary] = useState<RequestHistorySummary | null>(null);
  const [failures, setFailures] = useState<RequestHistoryEntry[] | null>(null);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);

  const loadStats = useCallback(async () => {
    setStatsError(null);
    try {
      setStats(await adminApi.stats(api));
    } catch (e) {
      setStatsError(e);
    }
  }, []);

  const loadSummary = useCallback(async (id: RangeId) => {
    const p = rangeToParams(id);
    setParams(p);
    try {
      setSummary(await requestHistoryApi.summary(api, p.fromUtc, p.toUtc, p.bucketMinutes));
    } catch {
      setSummary(null);
    }
  }, []);

  const loadFailures = useCallback(async () => {
    try {
      const page = await requestHistoryApi.list(api, { pageSize: 100 });
      setFailures(page.items.filter((r) => r.statusCode >= 400).slice(0, 6));
    } catch {
      setFailures(null);
    }
  }, []);

  const refresh = useCallback(async () => {
    await Promise.all([loadStats(), loadSummary(rangeId), loadFailures()]);
    setLoadedAt(new Date());
  }, [loadStats, loadSummary, loadFailures, rangeId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const n = (v: number | undefined) => (v === undefined ? '-' : formatNumber(locale, v));

  return (
    <div className="page">
      <PageHeader
        title={t('admin.overviewTitle')}
        subtitle={t('admin.overviewSubtitle')}
        actions={
          <>
            {loadedAt ? (
              <span className="small muted">{t('common.lastLoaded', { time: formatTime(locale, loadedAt) })}</span>
            ) : null}
            <button type="button" className="btn" onClick={() => void refresh()}>
              <Icon name="refresh" size={15} />
              {t('common.refresh')}
            </button>
          </>
        }
      />
      {statsError ? <ErrorBanner error={statsError} onRetry={loadStats} /> : null}
      <div className="kpis">
        <Kpi label={t('admin.kpiUsers')} value={n(stats?.users)} to="/admin/users" />
        <Kpi label={t('admin.kpiMachines')} value={n(stats?.machines)} to="/admin/machines" />
        <Kpi label={t('admin.kpiOnline')} value={n(stats?.onlineMachines)} to="/admin/machines" tone="success" />
        <Kpi label={t('admin.kpiConnections')} value={n(stats?.liveConnections)} />
        <Kpi label={t('admin.kpiStreams')} value={n(stats?.relayStreams)} />
        <Kpi label={t('admin.kpiSubscribers')} value={n(stats?.eventSubscribers)} />
      </div>
      <section className="section panel">
        <ChartHeader
          rangeId={rangeId}
          onRange={(id) => {
            setRangeId(id);
          }}
          onRefresh={() => void loadSummary(rangeId)}
        />
        <ActivityChart
          summary={summary}
          params={params}
          rangeId={rangeId}
          onBucketClick={(b) =>
            navigate(
              '/admin/requests?fromUtc=' +
                encodeURIComponent(b.bucketStartUtc) +
                '&toUtc=' +
                encodeURIComponent(b.bucketEndUtc),
            )
          }
        />
      </section>
      <section className="section">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2 className="section-title">{t('admin.recentFailures')}</h2>
          <Link to="/admin/requests">{t('admin.viewAll')}</Link>
        </div>
        <div className="table-frame">
          {failures && failures.length ? (
            <div className="table-scroll">
              <table className="data">
                <tbody>
                  {failures.map((r) => (
                    <tr
                      key={r.id}
                      className="clickable"
                      onClick={() =>
                        navigate(
                          '/admin/requests?fromUtc=' +
                            encodeURIComponent(r.createdUtc) +
                            '&toUtc=' +
                            encodeURIComponent(new Date(new Date(r.createdUtc).getTime() + 1000).toISOString()),
                        )
                      }
                    >
                      <td className="nowrap">{formatRelativeTime(locale, r.createdUtc)}</td>
                      <td>
                        <MethodBadge method={r.method} />
                      </td>
                      <td>
                        <span className="mono truncate">{r.path}</span>
                      </td>
                      <td>
                        <StatusCodeBadge code={r.statusCode} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty">{t('admin.noFailures')}</div>
          )}
        </div>
      </section>
      <section className="section panel">
        <h2 className="section-title">{t('admin.toolsTitle')}</h2>
        <p className="small muted">{t('admin.toolsBody')}</p>
        <div className="row">
          <Link className="btn btn-sm" to="/admin/explorer">
            <Icon name="terminal" size={15} />
            {t('nav.adminExplorer')}
          </Link>
          <a className="btn btn-sm" href="/openapi.json" target="_blank" rel="noreferrer">
            <Icon name="braces" size={15} />
            {t('admin.openApi')}
          </a>
          <a className="btn btn-sm" href="/swagger" target="_blank" rel="noreferrer">
            <Icon name="book" size={15} />
            {t('admin.swagger')}
          </a>
        </div>
      </section>
    </div>
  );
}
