import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { machinesApi } from '../../api';
import { api } from '../../apiClient';
import { DataTable, EmptyState, type Column } from '../../components/DataTable';
import { Modal } from '../../components/Modal';
import { useLocale } from '../../i18n/runtime';
import { formatBytes, formatDateTime } from '../../lib/format';
import type { Machine, MachineConnection, Page } from '../../types';

export function ConnectionsModal({ machine, onClose }: { machine: Machine; onClose: () => void }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(25);
  const [data, setData] = useState<Page<MachineConnection> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await machinesApi.connections(api, machine.id, { pageNumber: page, pageSize: size }));
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [machine.id, page, size]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns: Column<MachineConnection>[] = [
    {
      id: 'connected',
      header: t('machines.connColConnected'),
      pinned: true,
      className: 'nowrap',
      render: (c) => formatDateTime(locale, c.connectedUtc),
    },
    {
      id: 'disconnected',
      header: t('machines.connColDisconnected'),
      className: 'nowrap',
      render: (c) =>
        c.disconnectedUtc ? (
          formatDateTime(locale, c.disconnectedUtc)
        ) : (
          <span className="pill pill-success">{t('machines.connStillOpen')}</span>
        ),
    },
    { id: 'ip', header: t('machines.connColRemoteIp'), className: 'mono nowrap', render: (c) => c.remoteIp ?? '' },
    { id: 'version', header: t('machines.connColVersion'), render: (c) => c.muxVersion ?? '' },
    {
      id: 'close',
      header: t('machines.connColClose'),
      render: (c) => (c.closeCode ? c.closeCode + (c.closeReason ? ' ' + c.closeReason : '') : ''),
    },
    {
      id: 'traffic',
      header: t('machines.connColTraffic'),
      className: 'nowrap',
      render: (c) => formatBytes(locale, c.bytesIn ?? 0) + ' / ' + formatBytes(locale, c.bytesOut ?? 0),
    },
  ];

  return (
    <Modal title={t('machines.connectionsTitle', { name: machine.name })} size="xl" onClose={onClose}>
      <DataTable
        tableId="machine-connections"
        columns={columns}
        rows={data?.items ?? []}
        rowKey={(c) => c.id}
        loading={loading}
        error={error}
        onRetry={load}
        onRefresh={load}
        empty={<EmptyState title={t('machines.connEmpty')} />}
        paging={{
          pageNumber: page,
          pageSize: size,
          totalCount: data?.totalCount ?? 0,
          onPageChange: setPage,
          onPageSizeChange: (s) => {
            setSize(s);
            setPage(1);
          },
        }}
      />
    </Modal>
  );
}
