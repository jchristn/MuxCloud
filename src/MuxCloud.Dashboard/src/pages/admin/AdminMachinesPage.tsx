import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../../api';
import { api } from '../../apiClient';
import { MachineStatusPill } from '../../components/Badges';
import { CopyableId } from '../../components/CopyButton';
import { DataTable, EmptyState, type Column } from '../../components/DataTable';
import { JsonViewerModal } from '../../components/JsonViewerModal';
import { PageHeader } from '../../components/PageHeader';
import { usePageTitle } from '../../context/PageTitleContext';
import { useDebounced } from '../../hooks/useDebounced';
import { usePaged } from '../../hooks/usePaged';
import { useLocale } from '../../i18n/runtime';
import { formatDateTime, formatRelativeTime } from '../../lib/format';
import type { Machine } from '../../types';

export function AdminMachinesPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  usePageTitle(t('admin.machinesTitle'));
  const [name, setName] = useState('');
  const [state, setState] = useState<'all' | 'online' | 'offline'>('all');
  const [userId, setUserId] = useState('');
  const [json, setJson] = useState<Machine | null>(null);
  const n = useDebounced(name.trim());
  const u = useDebounced(userId.trim());
  const key = JSON.stringify([n, state, u]);
  const { data, loading, error, reload, paging } = usePaged<Machine>(
    'admin-machines',
    (pageNumber, pageSize) =>
      adminApi.machines(api, {
        pageNumber,
        pageSize,
        name: n || undefined,
        userId: u || undefined,
        online: state === 'all' ? undefined : state === 'online',
      }),
    key,
  );

  const columns: Column<Machine>[] = [
    {
      id: 'name',
      header: t('machines.colName'),
      pinned: true,
      render: (m) => <span className="cell-title">{m.name}</span>,
    },
    { id: 'status', header: t('machines.colStatus'), pinned: true, render: (m) => <MachineStatusPill machine={m} /> },
    {
      id: 'owner',
      header: t('admin.colOwner'),
      className: 'id-cell',
      render: (m) => (m.userId ? <CopyableId value={m.userId} /> : ''),
    },
    { id: 'host', header: t('machines.colHost'), className: 'mono nowrap', render: (m) => m.hostname ?? '' },
    { id: 'version', header: t('machines.colVersion'), className: 'mono', render: (m) => m.muxVersion ?? '' },
    {
      id: 'lastSeen',
      header: t('machines.colLastSeen'),
      className: 'nowrap',
      render: (m) =>
        m.lastSeenUtc ? (
          <span title={formatDateTime(locale, m.lastSeenUtc)}>{formatRelativeTime(locale, m.lastSeenUtc)}</span>
        ) : (
          t('machines.neverSeen')
        ),
    },
    {
      id: 'id',
      header: t('common.id'),
      className: 'id-cell',
      defaultHidden: true,
      render: (m) => <CopyableId value={m.id} />,
    },
  ];

  return (
    <div className="page">
      <PageHeader title={t('admin.machinesTitle')} subtitle={t('admin.machinesSubtitle')} />
      <DataTable
        tableId="admin-machines"
        caption={t('admin.machinesTitle')}
        columns={columns}
        rows={data?.items ?? []}
        rowKey={(m) => m.id}
        loading={loading}
        error={error}
        onRetry={reload}
        onRefresh={reload}
        paging={paging}
        onRowClick={setJson}
        rowActions={(m) => [
          { label: t('common.view'), icon: 'eye', onSelect: () => setJson(m) },
          { label: t('common.viewJson'), icon: 'braces', onSelect: () => setJson(m) },
        ]}
        filters={
          <>
            <div className="field">
              <label htmlFor="am-name">{t('common.search')}</label>
              <input
                id="am-name"
                className="input"
                type="search"
                placeholder={t('machines.searchPlaceholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="am-state">{t('machines.stateFilter')}</label>
              <select
                id="am-state"
                className="select"
                value={state}
                onChange={(e) => setState(e.target.value as typeof state)}
              >
                <option value="all">{t('machines.stateAll')}</option>
                <option value="online">{t('machines.stateOnline')}</option>
                <option value="offline">{t('machines.stateOffline')}</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="am-user">{t('admin.userIdFilter')}</label>
              <input
                id="am-user"
                className="input"
                placeholder="usr_"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              />
            </div>
          </>
        }
        empty={<EmptyState title={t('machines.noMatches')} />}
      />
      {json ? <JsonViewerModal title={json.name} value={json} onClose={() => setJson(null)} /> : null}
    </div>
  );
}
