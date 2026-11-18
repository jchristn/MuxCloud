import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { ApiError, machinesApi, relayApi } from '../../api';
import { api } from '../../apiClient';
import { MachineStatusPill } from '../../components/Badges';
import { ErrorBanner } from '../../components/ErrorBanner';
import { Icon } from '../../components/Icon';
import { JsonViewerModal } from '../../components/JsonViewerModal';
import { Loading } from '../../components/Spinner';
import { EmptyState } from '../../components/DataTable';
import { useAccountEvents } from '../../context/EventsContext';
import { usePageTitle } from '../../context/PageTitleContext';
import { useLocale } from '../../i18n/runtime';
import { formatDateTime, formatRelativeTime } from '../../lib/format';
import { sortMachines } from '../../lib/machines';
import type { Machine } from '../../types';

/** One machine: a switcher bar over that machine's own relayed mux dashboard. */
export function MachineDetailPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const session = params.get('session');
  const [machine, setMachine] = useState<Machine | null>(null);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [frameKey, setFrameKey] = useState(0);
  const [showJson, setShowJson] = useState(false);
  usePageTitle(machine ? t('pageTitles.machine', { name: machine.name }) : t('pageTitles.machines'));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [one, list] = await Promise.all([machinesApi.get(api, id), machinesApi.list(api, { pageSize: 1000 })]);
      setMachine(one);
      setMachines(sortMachines(list.items));
    } catch (e) {
      setError(e);
      setMachine(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useAccountEvents((event) => {
    if (event.type === 'machine.online' || event.type === 'machine.offline' || event.type === 'machine.updated') {
      setMachines((list) =>
        sortMachines(list.map((m) => (m.id === event.machine.id ? { ...m, ...event.machine } : m))),
      );
      if (event.machine.id === id) {
        if (event.type === 'machine.online' && machine && !machine.online) setFrameKey((k) => k + 1);
        setMachine((current) => (current ? { ...current, ...event.machine } : event.machine));
      }
    }
    if (event.type === 'machine.removed') {
      setMachines((list) => list.filter((m) => m.id !== event.machineId));
      if (event.machineId === id)
        setMachine((current) => (current ? { ...current, revoked: true, online: false } : current));
    }
  });

  const src = relayApi.dashboardPath(id) + (session ? '#session=' + encodeURIComponent(session) : '');

  let body;
  if (loading && !machine) body = <Loading />;
  else if (error) {
    const notFound = error instanceof ApiError && error.status === 404;
    body = (
      <div className="machine-state">
        {notFound ? (
          <div className="panel state-panel" data-testid="machine-not-found">
            <EmptyState
              icon="search"
              title={t('machineDetail.notFoundTitle')}
              body={t('machineDetail.notFoundBody')}
              action={
                <Link className="btn" to="/machines">
                  {t('machineDetail.allMachines')}
                </Link>
              }
            />
          </div>
        ) : (
          <ErrorBanner error={error} onRetry={load} />
        )}
      </div>
    );
  } else if (machine && machine.revoked) {
    body = (
      <div className="machine-state">
        <div className="panel state-panel" data-testid="machine-revoked">
          <EmptyState
            icon="shield"
            title={t('machineDetail.revokedTitle', { name: machine.name })}
            body={t('machineDetail.revokedBody')}
            action={
              <Link className="btn" to="/machines?add=1">
                {t('machines.addMachine')}
              </Link>
            }
          />
        </div>
      </div>
    );
  } else if (machine && !machine.online) {
    body = (
      <div className="machine-state">
        <div className="panel state-panel" data-testid="machine-offline">
          <EmptyState
            icon="plug"
            title={t('machineDetail.offlineTitle', { name: machine.name })}
            body={
              machine.lastSeenUtc
                ? t('machineDetail.offlineBody', { lastSeen: formatRelativeTime(locale, machine.lastSeenUtc) })
                : t('machineDetail.offlineNever')
            }
            action={
              <button
                type="button"
                className="btn"
                onClick={load}
                title={machine.lastSeenUtc ? formatDateTime(locale, machine.lastSeenUtc) : undefined}
              >
                <Icon name="refresh" size={15} />
                {t('machineDetail.reload')}
              </button>
            }
          />
        </div>
      </div>
    );
  } else if (machine) {
    body = (
      <iframe
        key={frameKey}
        className="machine-frame"
        src={src}
        title={t('machineDetail.frameTitle', { name: machine.name })}
        data-testid="machine-frame"
      />
    );
  }

  return (
    <>
      <div className="machine-bar">
        <Link to="/machines" className="btn btn-sm btn-ghost" title={t('machineDetail.allMachines')}>
          <Icon name="chevronLeft" size={15} className="flip-rtl" />
          <span className="desktop-only">{t('machineDetail.allMachines')}</span>
        </Link>
        <label className="sr-only" htmlFor="machine-switcher">
          {t('machineDetail.switchTo')}
        </label>
        <select
          id="machine-switcher"
          className="select select-sm machine-switcher"
          value={machines.some((m) => m.id === id) ? id : ''}
          onChange={(e) => navigate('/machines/' + encodeURIComponent(e.target.value))}
          title={t('machineDetail.switchTo')}
        >
          {machines.some((m) => m.id === id) ? null : (
            <option value="" disabled>
              {machine?.name ?? t('machineDetail.chooseMachine')}
            </option>
          )}
          {machines.map((m) => (
            <option key={m.id} value={m.id}>
              {(m.online ? '● ' : '○ ') + m.name}
            </option>
          ))}
        </select>
        {machine ? (
          <span className="machine-bar-status" title={t('machines.colStatus')}>
            <MachineStatusPill machine={machine} />
          </span>
        ) : null}
        {machine?.online && machine.awaitingApproval > 0 ? (
          <span className="pill pill-warning desktop-only">{t('machineDetail.approvalWaiting')}</span>
        ) : null}
        <span className="topbar-spacer" />
        {machine?.online ? (
          <>
            <button
              type="button"
              className="icon-btn"
              onClick={() => setFrameKey((k) => k + 1)}
              aria-label={t('machineDetail.reload')}
              title={t('machineDetail.reload')}
            >
              <Icon name="refresh" />
            </button>
            <a
              className="icon-btn"
              href={src}
              target="_blank"
              rel="noreferrer"
              aria-label={t('machineDetail.openInTab')}
              title={t('machineDetail.openInTab')}
            >
              <Icon name="external" />
            </a>
          </>
        ) : null}
        {machine ? (
          <button
            type="button"
            className="icon-btn"
            onClick={() => setShowJson(true)}
            aria-label={t('machineDetail.details')}
            title={t('machineDetail.details')}
          >
            <Icon name="info" />
          </button>
        ) : null}
      </div>
      {body}
      {showJson && machine ? (
        <JsonViewerModal title={machine.name} value={machine} onClose={() => setShowJson(false)} />
      ) : null}
    </>
  );
}
