import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { ApiError, machinesApi, relayApi } from '../../api';
import { api } from '../../apiClient';
import { Banner } from '../../components/Banner';
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

  const columns: Column<ConversationRow>[] = [
    {
      id: 'title',
      header: t('conversations.colTitle'),
      pinned: true,
      sortValue: (r) => (r.session.Title ?? '').toLowerCase(),
      render: (r) => (
        <div>
          <div className="cell-title truncate">{r.session.Title || t('conversations.untitled')}</div>
          <div className="cell-sub mono">{r.session.Id}</div>
        </div>
      ),
    },
    {
      id: 'machine',
      header: t('conversations.colMachine'),
      pinned: true,
      sortValue: (r) => r.machineName.toLowerCase(),
      render: (r) => r.machineName,
    },
    {
      id: 'model',
      header: t('conversations.colModel'),
      sortValue: (r) => r.session.Model ?? '',
      className: 'mono nowrap',
      render: (r) => r.session.Model ?? '',
    },
    {
      id: 'endpoint',
      header: t('conversations.colEndpoint'),
      defaultHidden: true,
      render: (r) => r.session.EndpointName ?? '',
    },
    {
      id: 'messages',
      header: t('conversations.colMessages'),
      className: 'num',
      sortValue: (r) => r.session.MessageCount ?? 0,
      render: (r) => formatNumber(locale, r.session.MessageCount ?? 0),
    },
    {
      id: 'folder',
      header: t('conversations.colFolder'),
      render: (r) => (
        <span className="mono truncate" title={r.session.WorkingDirectory}>
          {r.session.WorkingDirectory ?? ''}
        </span>
      ),
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
    {
      id: 'updated',
      header: t('conversations.colUpdated'),
      className: 'nowrap',
      sortValue: (r) => r.session.UpdatedUtc ?? r.session.CreatedUtc ?? '',
      render: (r) => {
        const when = r.session.UpdatedUtc ?? r.session.CreatedUtc;
        return when ? <span title={formatDateTime(locale, when)}>{formatRelativeTime(locale, when)}</span> : '';
      },
    },
  ];

  let empty;
  if (!loading && online.length === 0)
    empty = <EmptyState title={t('conversations.emptyTitle')} body={t('conversations.noOnline')} />;
  else if (rows.length === 0)
    empty = <EmptyState title={t('conversations.emptyTitle')} body={t('conversations.emptyBody')} />;
  else empty = <EmptyState title={t('conversations.noMatches')} />;

  return (
    <div className="page">
      <PageHeader
        title={t('conversations.title')}
        subtitle={t('conversations.subtitle')}
        actions={
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setNewOpen(true)}
            disabled={online.length === 0}
          >
            <Icon name="plus" size={16} />
            {t('conversations.newConversation')}
          </button>
        }
      />
      {error ? <ErrorBanner error={error} onRetry={load} /> : null}
      {loading && online.length > 0 ? (
        <Banner tone="info">{t('conversations.loadingMachines', { count: online.length })}</Banner>
      ) : null}
      {failed.map((f) => (
        <Banner key={f.machine.id} tone="warning">
          {t('conversations.machineFailed', { name: f.machine.name })}{' '}
          {t('errors.' + (f.errorCode ?? 'generic'), { status: 0, seconds: 0 })}
        </Banner>
      ))}
      {offline.length > 0 ? (
        <p className="small muted">
          {t('conversations.offlineSkipped', {
            names: formatList(
              locale,
              offline.map((m) => m.name),
            ),
          })}
        </p>
      ) : null}
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
      />
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
