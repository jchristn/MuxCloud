import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router';
import { machinesApi } from '../../api';
import { api } from '../../apiClient';
import { MachineStatusPill } from '../../components/Badges';
import { ConfirmModal } from '../../components/ConfirmModal';
import { CopyableId } from '../../components/CopyButton';
import { DataTable, EmptyState, type Column } from '../../components/DataTable';
import { Icon } from '../../components/Icon';
import { JsonViewerModal } from '../../components/JsonViewerModal';
import { Kpi } from '../../components/Kpi';
import { PageHeader } from '../../components/PageHeader';
import { RemoteControlNotice } from '../../components/RemoteControlNotice';
import { useAccountEvents } from '../../context/EventsContext';
import { usePageTitle } from '../../context/PageTitleContext';
import { useToast } from '../../context/ToastContext';
import { useDebounced } from '../../hooks/useDebounced';
import { usePersistentState } from '../../hooks/usePersistentState';
import { useLocale } from '../../i18n/runtime';
import { formatDateTime, formatNumber, formatRelativeTime } from '../../lib/format';
import { applyMachineEvent, machineTotals } from '../../lib/machines';
import type { Machine, Page } from '../../types';
import { AddMachineModal } from './AddMachineModal';
import { ConnectionsModal } from './ConnectionsModal';
import { RenameMachineModal } from './RenameMachineModal';

type Dialog =
  | { kind: 'add' }
  | { kind: 'rename'; machine: Machine }
  | { kind: 'connections'; machine: Machine }
  | { kind: 'json'; machine: Machine }
  | { kind: 'revoke'; machine: Machine }
  | { kind: 'remove'; machine: Machine };

export function MachinesPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const navigate = useNavigate();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  usePageTitle(t('pageTitles.machines'));

  const [search, setSearch] = useState('');
  const [state, setState] = useState<'all' | 'online' | 'offline'>('all');
  const [includeRevoked, setIncludeRevoked] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = usePersistentState('muxcloud.table.machines.pageSize', 25);
  const [data, setData] = useState<Page<Machine> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [dialog, setDialog] = useState<Dialog | null>(params.get('add') ? { kind: 'add' } : null);
  const name = useDebounced(search.trim(), 300);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(
        await machinesApi.list(api, {
          pageNumber,
          pageSize,
          name: name || undefined,
          online: state === 'all' ? undefined : state === 'online',
          includeRevoked: includeRevoked || undefined,
        }),
      );
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [pageNumber, pageSize, name, state, includeRevoked]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => setPageNumber(1), [name, state, includeRevoked]);

  useAccountEvents((event) => {
    if (event.type === 'server.connected' || event.type === 'ping' || event.type === 'subscription.updated') return;
    const current = data;
    if (!current) return;
    if (event.type === 'machine.removed') {
      setData((d) =>
        d
          ? {
              ...d,
              items: applyMachineEvent(d.items, event),
              totalCount: d.items.some((m) => m.id === event.machineId) ? Math.max(0, d.totalCount - 1) : d.totalCount,
            }
          : d,
      );
      return;
    }
    const updated = event.machine;
    const stillMatches =
      (includeRevoked || !updated.revoked) && (state === 'all' || updated.online === (state === 'online'));
    if (!current.items.some((m) => m.id === updated.id) || !stillMatches) {
      // A machine this page does not show (new, or filtered out), or one that no longer matches the filters (it was
      // revoked, signed out, or changed state): reload so the rows, counts, and filters stay right.
      void load();
      return;
    }
    setData((d) => (d ? { ...d, items: applyMachineEvent(d.items, event) } : d));
  });

  const closeDialog = () => {
    setDialog(null);
    if (params.get('add')) {
      params.delete('add');
      setParams(params, { replace: true });
    }
  };

  const replace = (machine: Machine) =>
    setData((current) =>
      current ? { ...current, items: current.items.map((m) => (m.id === machine.id ? machine : m)) } : current,
    );

  const totals = machineTotals(data?.items ?? []);
  const n = (v: number) => formatNumber(locale, v);

  const lastSeen = (m: Machine) =>
    m.lastSeenUtc ? (
      <span title={formatDateTime(locale, m.lastSeenUtc)}>
        {t('machines.lastSeenAgo', { time: formatRelativeTime(locale, m.lastSeenUtc) })}
      </span>
    ) : (
      t('machines.neverSeen')
    );

  const columns: Column<Machine>[] = [
    {
      id: 'name',
      header: t('machines.colName'),
      pinned: true,
      mobile: 'title',
      render: (m) => (
        <div className="cell-stack">
          <div className="cell-title truncate">{m.name}</div>
          <div className="cell-sub mono truncate">{m.id}</div>
        </div>
      ),
    },
    {
      id: 'status',
      header: t('machines.colStatus'),
      pinned: true,
      mobile: 'badge',
      className: 'nowrap',
      render: (m) => (
        <div className="cell-stack">
          <MachineStatusPill machine={m} />
          {!m.online && !m.revoked ? <div className="cell-sub">{lastSeen(m)}</div> : null}
          {m.online && m.awaitingApproval > 0 ? (
            <div className="cell-sub">{t('machines.awaitingCount', { count: m.awaitingApproval })}</div>
          ) : null}
        </div>
      ),
    },
    {
      id: 'host',
      header: t('machines.colHost'),
      mobile: 'meta',
      render: (m) => (
        <div className="cell-stack">
          <div className="mono truncate" title={m.hostname}>
            {m.hostname ?? ''}
          </div>
          <div className="cell-sub truncate">
            {[m.os, m.muxVersion ? 'mux ' + m.muxVersion : ''].filter(Boolean).join(' \u00b7 ')}
          </div>
        </div>
      ),
    },
    {
      id: 'runs',
      header: t('machines.colActiveRuns'),
      hideBelow: 'lg',
      className: 'num',
      mobile: 'meta',
      render: (m) => n(m.online ? m.activeRuns : 0),
    },
    {
      id: 'remote',
      header: t('machines.colRemoteApproval'),
      hideBelow: 'lg',
      className: 'nowrap',
      render: (m) => (
        <span className={'pill ' + (m.remoteToolApproval ? 'pill-warning' : '')}>
          {m.remoteToolApproval ? t('machines.remoteApprovalOn') : t('machines.remoteApprovalOff')}
        </span>
      ),
    },
    {
      id: 'awaiting',
      header: t('machines.colAwaiting'),
      defaultHidden: true,
      className: 'num',
      render: (m) => n(m.online ? m.awaitingApproval : 0),
    },
    { id: 'os', header: t('machines.colOs'), defaultHidden: true, render: (m) => m.os ?? '' },
    {
      id: 'version',
      header: t('machines.colVersion'),
      defaultHidden: true,
      className: 'mono nowrap',
      render: (m) => m.muxVersion ?? '',
    },
    {
      id: 'lastSeen',
      header: t('machines.colLastSeen'),
      defaultHidden: true,
      className: 'nowrap',
      render: (m) => (m.online ? t('machines.statusOnline') : lastSeen(m)),
    },
    {
      id: 'secret',
      header: t('machines.colSecret'),
      defaultHidden: true,
      className: 'mono nowrap',
      render: (m) => (m.secretLast4 ? '****' + m.secretLast4 : ''),
    },
    {
      id: 'created',
      header: t('machines.colCreated'),
      defaultHidden: true,
      className: 'nowrap',
      render: (m) => formatDateTime(locale, m.createdUtc),
    },
    {
      id: 'id',
      header: t('common.id'),
      defaultHidden: true,
      className: 'id-cell',
      render: (m) => <CopyableId value={m.id} />,
    },
  ];

  const filtered = !!name || state !== 'all' || includeRevoked;
  const firstRun = !loading && !error && !filtered && data !== null && data.totalCount === 0;

  return (
    <div className="page">
      <PageHeader
        title={t('machines.title')}
        subtitle={t('machines.subtitle')}
        actions={
          firstRun ? undefined : (
            <button type="button" className="btn btn-primary" onClick={() => setDialog({ kind: 'add' })}>
              <Icon name="plus" size={16} />
              {t('machines.addMachine')}
            </button>
          )
        }
      />
      {firstRun ? (
        <section className="panel onboarding" data-testid="machines-first-run">
          <EmptyState
            icon="server"
            title={t('machines.emptyTitle')}
            body={t('machines.emptyBody')}
            action={
              <button type="button" className="btn btn-primary" onClick={() => setDialog({ kind: 'add' })}>
                <Icon name="plus" size={16} />
                {t('machines.addMachine')}
              </button>
            }
          />
        </section>
      ) : (
        <>
          <div className="kpis">
            <Kpi label={t('machines.kpiTotal')} value={n(data?.totalCount ?? 0)} />
            <Kpi
              label={t('machines.kpiOnline')}
              value={n(totals.online)}
              tone={totals.online ? 'success' : undefined}
            />
            <Kpi label={t('machines.kpiActiveRuns')} value={n(totals.activeRuns)} />
            <Kpi
              label={t('machines.kpiAwaiting')}
              value={n(totals.awaitingApproval)}
              tone={totals.awaitingApproval ? 'warning' : undefined}
            />
          </div>
          <DataTable
            tableId="machines"
            caption={t('machines.title')}
            columns={columns}
            rows={data?.items ?? []}
            rowKey={(m) => m.id}
            loading={loading}
            error={error}
            onRetry={load}
            onRefresh={load}
            onRowClick={(m) =>
              m.revoked ? setDialog({ kind: 'json', machine: m }) : navigate('/machines/' + encodeURIComponent(m.id))
            }
            rowActions={(m) => [
              {
                label: t('machines.openDashboard'),
                icon: 'external',
                onSelect: () => navigate('/machines/' + encodeURIComponent(m.id)),
                disabled: m.revoked,
              },
              {
                label: t('machines.rename'),
                icon: 'edit',
                onSelect: () => setDialog({ kind: 'rename', machine: m }),
                disabled: m.revoked,
              },
              {
                label: t('machines.connections'),
                icon: 'activity',
                onSelect: () => setDialog({ kind: 'connections', machine: m }),
              },
              { label: t('common.viewJson'), icon: 'braces', onSelect: () => setDialog({ kind: 'json', machine: m }) },
              {
                label: t('machines.revoke'),
                icon: 'shield',
                danger: true,
                separatorBefore: true,
                onSelect: () => setDialog({ kind: 'revoke', machine: m }),
                disabled: m.revoked,
              },
              {
                label: t('machines.remove'),
                icon: 'trash',
                danger: true,
                onSelect: () => setDialog({ kind: 'remove', machine: m }),
              },
            ]}
            filters={
              <>
                <div className="field">
                  <label htmlFor="machine-search">{t('common.search')}</label>
                  <input
                    id="machine-search"
                    className="input"
                    type="search"
                    placeholder={t('machines.searchPlaceholder')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="machine-state">{t('machines.stateFilter')}</label>
                  <select
                    id="machine-state"
                    className="select"
                    value={state}
                    onChange={(e) => setState(e.target.value as typeof state)}
                  >
                    <option value="all">{t('machines.stateAll')}</option>
                    <option value="online">{t('machines.stateOnline')}</option>
                    <option value="offline">{t('machines.stateOffline')}</option>
                  </select>
                </div>
                <label className="checkbox" style={{ alignSelf: 'center', marginTop: 18 }}>
                  <input
                    type="checkbox"
                    checked={includeRevoked}
                    onChange={(e) => setIncludeRevoked(e.target.checked)}
                  />
                  <span>{t('machines.includeRevoked')}</span>
                </label>
              </>
            }
            paging={{
              pageNumber,
              pageSize,
              totalCount: data?.totalCount ?? 0,
              onPageChange: setPageNumber,
              onPageSizeChange: (s) => {
                setPageSize(s);
                setPageNumber(1);
              },
            }}
            empty={<EmptyState icon="search" title={t('machines.noMatches')} />}
          />
        </>
      )}
      <RemoteControlNotice />

      {dialog?.kind === 'add' ? <AddMachineModal onClose={closeDialog} /> : null}
      {dialog?.kind === 'rename' ? (
        <RenameMachineModal
          machine={dialog.machine}
          onClose={closeDialog}
          onSaved={(m) => {
            replace(m);
            toast.success(t('machines.renamed'));
          }}
        />
      ) : null}
      {dialog?.kind === 'connections' ? <ConnectionsModal machine={dialog.machine} onClose={closeDialog} /> : null}
      {dialog?.kind === 'json' ? (
        <JsonViewerModal title={dialog.machine.name} value={dialog.machine} onClose={closeDialog} />
      ) : null}
      {dialog?.kind === 'revoke' ? (
        <ConfirmModal
          title={t('machines.revokeTitle', { name: dialog.machine.name })}
          body={t('machines.revokeBody')}
          confirmLabel={t('machines.revoke')}
          danger
          onClose={closeDialog}
          onConfirm={async () => {
            replace(await machinesApi.revoke(api, dialog.machine.id));
            toast.success(t('machines.revoked'));
          }}
        />
      ) : null}
      {dialog?.kind === 'remove' ? (
        <ConfirmModal
          title={t('machines.removeTitle', { name: dialog.machine.name })}
          body={t('machines.removeBody')}
          confirmLabel={t('machines.remove')}
          danger
          onClose={closeDialog}
          onConfirm={async () => {
            await machinesApi.remove(api, dialog.machine.id);
            toast.success(t('machines.removed'));
            await load();
          }}
        />
      ) : null}
    </div>
  );
}
