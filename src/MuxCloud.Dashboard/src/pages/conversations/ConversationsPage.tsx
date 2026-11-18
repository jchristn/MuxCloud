import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { ApiError, machinesApi, relayApi } from '../../api';
import { api } from '../../apiClient';
import { DataTable, EmptyState, type Column } from '../../components/DataTable';
import { ErrorBanner } from '../../components/ErrorBanner';
import { Icon } from '../../components/Icon';
import { JsonViewerModal } from '../../components/JsonViewerModal';
import { Modal } from '../../components/Modal';
import { PageHeader } from '../../components/PageHeader';
import { useAccountEvents } from '../../context/EventsContext';
import { usePageTitle } from '../../context/PageTitleContext';
import { useLocale } from '../../i18n/runtime';
import {
  filterConversations,
  mapWithConcurrency,
  mergeConversations,
  type ConversationRow,
  type MachineLoadResult,
} from '../../lib/conversations';
import { formatDateTime, formatList, formatNumber, formatRelativeTime } from '../../lib/format';
import { machineColorIndex } from '../../lib/machines';
import type { Machine } from '../../types';

export function ConversationsPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const navigate = useNavigate();
  usePageTitle(t('pageTitles.conversations'));
  const [machines, setMachines] = useState<Machine[]>([]);
  const [results, setResults] = useState<MachineLoadResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [machineFilter, setMachineFilter] = useState('');
  const [search, setSearch] = useState('');
  const [json, setJson] = useState<ConversationRow | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const generation = useRef(0);

  const load = useCallback(async () => {
    const mine = ++generation.current;
    setLoading(true);
    setError(null);
    try {
      const list = await machinesApi.list(api, { pageSize: 1000 });
      if (mine !== generation.current) return;
      setMachines(list.items);
      const online = list.items.filter((m) => m.online && !m.revoked);
      const loaded = await mapWithConcurrency(online, 4, async (machine): Promise<MachineLoadResult> => {
        try {
          const response = await relayApi.sessions(api, machine.id);
          return { machine, sessions: response?.Items ?? [], errorCode: null };
        } catch (e) {
          return { machine, sessions: null, errorCode: e instanceof ApiError ? e.code : 'generic' };
        }
      });
      if (mine !== generation.current) return;
      setResults(loaded);
    } catch (e) {
      if (mine === generation.current) setError(e);
    } finally {
      if (mine === generation.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useAccountEvents((event) => {
    if (event.type === 'machine.online' || event.type === 'machine.offline' || event.type === 'machine.removed')
      void load();
  });

  const rows = useMemo(() => mergeConversations(results), [results]);
  const visible = useMemo(() => filterConversations(rows, machineFilter, search), [rows, machineFilter, search]);
  const failed = results.filter((r) => r.sessions === null);
  const offline = machines.filter((m) => !m.online && !m.revoked);
  const online = machines.filter((m) => m.online && !m.revoked);

  const open = (row: ConversationRow) =>
    navigate('/machines/' + encodeURIComponent(row.machineId) + '?session=' + encodeURIComponent(row.session.Id));

  const machineCell = (machineId: string, machineName: string) => (
    <span className="machine-tag" title={machineId}>
      <span className={'machine-dot machine-dot-' + machineColorIndex(machineId)} aria-hidden="true" />
      <span className="truncate">{machineName}</span>
    </span>
  );

  const columns: Column<ConversationRow>[] = [
    {
      id: 'title',
      header: t('conversations.colTitle'),
      pinned: true,
      mobile: 'title',
      sortValue: (r) => (r.session.Title ?? '').toLowerCase(),
      render: (r) => (
        <div className="cell-stack">
          <div className="cell-title truncate">{r.session.Title || t('conversations.untitled')}</div>
          {r.session.WorkingDirectory ? (
            <div className="cell-sub mono truncate" title={r.session.WorkingDirectory}>
              {r.session.WorkingDirectory}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      id: 'machine',
      header: t('conversations.colMachine'),
      pinned: true,
      mobile: 'badge',
      sortValue: (r) => r.machineName.toLowerCase(),
      render: (r) => machineCell(r.machineId, r.machineName),
    },
    {
      id: 'model',
      header: t('conversations.colModel'),
      mobile: 'meta',
      sortValue: (r) => r.session.Model ?? '',
      className: 'mono nowrap',
      render: (r) => <span className="truncate">{r.session.Model ?? ''}</span>,
    },
    {
      id: 'messages',
      header: t('conversations.colMessages'),
      hideBelow: 'lg',
      className: 'num',
      sortValue: (r) => r.session.MessageCount ?? 0,
      render: (r) => formatNumber(locale, r.session.MessageCount ?? 0),
    },
    {
      id: 'updated',
      header: t('conversations.colUpdated'),
      className: 'nowrap',
      mobile: 'meta',
      sortValue: (r) => r.session.UpdatedUtc ?? r.session.CreatedUtc ?? '',
      render: (r) => {
        const when = r.session.UpdatedUtc ?? r.session.CreatedUtc;
        return when ? <span title={formatDateTime(locale, when)}>{formatRelativeTime(locale, when)}</span> : '';
      },
    },
    {
      id: 'folder',
      header: t('conversations.colFolder'),
      defaultHidden: true,
      className: 'mono',
      render: (r) => <span className="truncate">{r.session.WorkingDirectory ?? ''}</span>,
    },
    {
      id: 'endpoint',
      header: t('conversations.colEndpoint'),
      defaultHidden: true,
      render: (r) => r.session.EndpointName ?? '',
    },
    {
      id: 'labels',
      header: t('conversations.colLabels'),
      defaultHidden: true,
      render: (r) => (
        <span className="row">
          {(r.session.Labels ?? []).map((l) => (
            <span key={l} className="pill">
              {l}
            </span>
          ))}
        </span>
      ),
    },
    { id: 'id', header: t('common.id'), defaultHidden: true, className: 'mono nowrap', render: (r) => r.session.Id },
  ];

  const filteredMachine = online.find((m) => m.id === machineFilter);
  const noMachines = !loading && !error && machines.filter((m) => !m.revoked).length === 0;
  let empty;
  if (noMachines)
    empty = (
      <EmptyState
        icon="server"
        title={t('conversations.emptyTitle')}
        body={t('conversations.noMachines')}
        action={
          <Link className="btn btn-primary" to="/machines?add=1">
            <Icon name="plus" size={16} />
            {t('machines.addMachine')}
          </Link>
        }
      />
    );
  else if (!loading && online.length === 0)
    empty = (
      <EmptyState
        icon="plug"
        title={t('conversations.emptyTitle')}
        body={t('conversations.noOnline')}
        action={
          <Link className="btn" to="/machines">
            {t('machineDetail.allMachines')}
          </Link>
        }
      />
    );
  else if (filteredMachine && !search.trim() && !rows.some((r) => r.machineId === filteredMachine.id))
    empty = (
      <EmptyState
        icon="messages"
        title={t('conversations.machineEmptyTitle', { name: filteredMachine.name })}
        body={t('conversations.machineEmptyBody')}
        action={
          <Link className="btn btn-primary" to={'/machines/' + encodeURIComponent(filteredMachine.id)}>
            {t('conversations.openMachine', { name: filteredMachine.name })}
          </Link>
        }
      />
    );
  else if (rows.length === 0)
    empty = (
      <EmptyState
        icon="messages"
        title={t('conversations.emptyTitle')}
        body={t('conversations.emptyBody')}
        action={
          <button type="button" className="btn btn-primary" onClick={() => setNewOpen(true)}>
            <Icon name="plus" size={16} />
            {t('conversations.newConversation')}
          </button>
        }
      />
    );
  else empty = <EmptyState icon="search" title={t('conversations.noMatches')} />;

  const notices =
    (loading && online.length > 0) || failed.length > 0 || offline.length > 0 ? (
      <>
        {loading && online.length > 0 ? (
          <p className="notice">
            <span className="spinner spinner-sm" aria-hidden="true" />
            {t('conversations.loadingMachines', { count: online.length })}
          </p>
        ) : null}
        {failed.map((f) => (
          <p key={f.machine.id} className="notice notice-warning">
            <Icon name="alert" size={14} />
            <span>
              {t('conversations.machineFailed', { name: f.machine.name })}{' '}
              {t('errors.' + (f.errorCode ?? 'generic'), { status: 0, seconds: 0 })}
            </span>
          </p>
        ))}
        {offline.length > 0 ? (
          <p className="notice">
            <Icon name="info" size={14} />
            <span>
              {t('conversations.offlineSkipped', {
                names: formatList(
                  locale,
                  offline.map((m) => m.name),
                ),
              })}
            </span>
          </p>
        ) : null}
      </>
    ) : null;

  return (
    <div className="page">
      <PageHeader
        title={t('conversations.title')}
        subtitle={t('conversations.subtitle')}
        actions={
          online.length > 0 ? (
            <button type="button" className="btn btn-primary" onClick={() => setNewOpen(true)}>
              <Icon name="plus" size={16} />
              {t('conversations.newConversation')}
            </button>
          ) : undefined
        }
      />
      {error ? <ErrorBanner error={error} onRetry={load} /> : null}
      {noMachines ? (
        <section className="panel onboarding" data-testid="conversations-no-machines">
          {empty}
        </section>
      ) : (
        <DataTable
          tableId="conversations"
          caption={t('conversations.title')}
          columns={columns}
          rows={visible}
          rowKey={(r) => r.key}
          loading={loading}
          onRefresh={load}
          onRowClick={open}
          rowActions={(r) => [
            { label: t('conversations.open'), icon: 'external', onSelect: () => open(r) },
            { label: t('common.viewJson'), icon: 'braces', onSelect: () => setJson(r) },
          ]}
          filters={
            <>
              <div className="field">
                <label htmlFor="conv-machine">{t('conversations.machineFilter')}</label>
                <select
                  id="conv-machine"
                  className="select"
                  value={machineFilter}
                  onChange={(e) => setMachineFilter(e.target.value)}
                >
                  <option value="">{t('conversations.allMachines')}</option>
                  {online.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="conv-search">{t('common.search')}</label>
                <input
                  id="conv-search"
                  className="input"
                  type="search"
                  placeholder={t('conversations.searchPlaceholder')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </>
          }
          empty={empty}
          notices={notices}
        />
      )}
      {json ? (
        <JsonViewerModal
          title={json.session.Title || json.session.Id}
          value={json.session}
          onClose={() => setJson(null)}
        />
      ) : null}
      {newOpen ? (
        <Modal title={t('conversations.newConversation')} size="sm" onClose={() => setNewOpen(false)}>
          <div className="form-stack">
            <p className="small muted">{t('conversations.newConversationHint')}</p>
            {online.map((m) => (
              <button
                key={m.id}
                type="button"
                className="btn"
                style={{ justifyContent: 'flex-start' }}
                onClick={() => navigate('/machines/' + encodeURIComponent(m.id))}
              >
                <Icon name="server" size={16} />
                {m.name}
              </button>
            ))}
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
