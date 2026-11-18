import { useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { PHONE_QUERY, useMediaQuery } from '../hooks/useMediaQuery';
import { usePersistentState } from '../hooks/usePersistentState';
import { slicePage } from '../lib/pagination';
import { ActionMenu, type MenuItem } from './ActionMenu';
import { ErrorBanner } from './ErrorBanner';
import { Icon } from './Icon';
import { Pager, needsPaging } from './Pager';

/** Where a column goes when rows render as cards on phones. */
export type MobileRole = 'title' | 'badge' | 'meta' | 'hidden';

export interface Column<T> {
  id: string;
  header: string;
  render: (row: T) => ReactNode;
  /** Enables client-side sorting on this column. */
  sortValue?: (row: T) => string | number;
  /** Always shown; cannot be hidden from Select Columns. */
  pinned?: boolean;
  /** Hidden until the user turns it on. */
  defaultHidden?: boolean;
  /** Cell class (alignment, monospace). Header cells only take alignment from it. */
  className?: string;
  /**
   * Phone card role. Default: the first column is the title, the next two visible columns are meta lines, the rest
   * are hidden.
   */
  mobile?: MobileRole;
  /** Hide the column in table layout below this width ('lg' = 1024px), to keep tablets free of sideways scroll. */
  hideBelow?: 'lg';
}

export interface ServerPaging {
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

interface DataTableProps<T> {
  tableId: string;
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  empty?: ReactNode;
  onRowClick?: (row: T) => void;
  rowActions?: (row: T) => MenuItem[];
  onRefresh?: () => void;
  addLabel?: string;
  onAdd?: () => void;
  toolbarExtra?: ReactNode;
  filters?: ReactNode;
  /** Quiet informational lines shown inside the card, under the filters. */
  notices?: ReactNode;
  /** Server-side paging. Without it the table pages and sorts the rows it was given. */
  paging?: ServerPaging;
  selectable?: boolean;
  bulkActions?: (selected: T[], clear: () => void) => ReactNode;
  caption?: string;
}

function ignoreRowClick(target: EventTarget | null, stop: string): boolean {
  let el = target as HTMLElement | null;
  while (el && !el.matches?.(stop)) {
    if (el.matches?.('button, a, input, select, textarea, label, [data-ignore-row-click]')) return true;
    el = el.parentElement;
  }
  return false;
}

function headerClass<T>(c: Column<T>): string | undefined {
  const keep = new Set(['num', 'actions-cell', 'select-cell']);
  const kept: string[] = (c.className ?? '').split(/\s+/).filter((x) => keep.has(x));
  if (c.hideBelow) kept.push('col-hide-' + c.hideBelow);
  return kept.length ? kept.join(' ') : undefined;
}

function cellClass<T>(c: Column<T>): string | undefined {
  const parts = [c.className, c.hideBelow ? 'col-hide-' + c.hideBelow : ''].filter(Boolean);
  return parts.length ? parts.join(' ') : undefined;
}

/**
 * The dashboard's table: a toolbar with paging (only when there is more than one page), refresh, add, and Select
 * Columns above the table; loading, empty, and error states; row action menus; row click opens edit; optional
 * selection with a bulk bar. On phones rows render as cards.
 */
export function DataTable<T>(props: DataTableProps<T>) {
  const { t } = useTranslation();
  const phone = useMediaQuery(PHONE_QUERY);
  const { tableId, columns, rows, rowKey, paging } = props;
  const [hidden, setHidden] = usePersistentState<string[]>(
    'muxcloud.table.v2.' + tableId + '.hidden',
    columns.filter((c) => c.defaultHidden).map((c) => c.id),
  );
  const [localSize, setLocalSize] = usePersistentState<number>('muxcloud.table.' + tableId + '.pageSize', 25);
  const [localPage, setLocalPage] = useState(1);
  const [sort, setSort] = useState<{ id: string; dir: 'asc' | 'desc' } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const visible = columns.filter((c) => c.pinned || !hidden.includes(c.id));

  const sorted = useMemo(() => {
    if (paging || !sort) return rows;
    const column = columns.find((c) => c.id === sort.id);
    if (!column?.sortValue) return rows;
    const value = column.sortValue;
    return rows.slice().sort((a, b) => {
      const x = value(a);
      const y = value(b);
      const result = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
      return sort.dir === 'asc' ? result : -result;
    });
  }, [rows, sort, columns, paging]);

  const pageRows = paging ? sorted : slicePage(sorted, localPage, localSize);
  const pagerProps = paging ?? {
    pageNumber: localPage,
    pageSize: localSize,
    totalCount: rows.length,
    onPageChange: setLocalPage,
    onPageSizeChange: (size: number) => {
      setLocalSize(size);
      setLocalPage(1);
    },
  };
  const showPager = needsPaging(pagerProps.pageNumber, pagerProps.pageSize, pagerProps.totalCount);

  const clearSelection = () => setSelected(new Set());
  const selectedRows = rows.filter((r) => selected.has(rowKey(r)));
  const allOnPage = pageRows.length > 0 && pageRows.every((r) => selected.has(rowKey(r)));

  const columnMenu: MenuItem[] = columns
    .filter((c) => !c.pinned)
    .map((c) => ({
      label: c.header,
      checked: !hidden.includes(c.id),
      onSelect: () => setHidden(hidden.includes(c.id) ? hidden.filter((h) => h !== c.id) : [...hidden, c.id]),
    }));

  const colSpan = visible.length + (props.rowActions ? 1 : 0) + (props.selectable ? 1 : 0);
  const showEmpty = pageRows.length === 0 && !props.error && !(props.loading && rows.length === 0);
  const showLoading = props.loading && rows.length === 0;

  // Phone card roles.
  const roles = useMemo(() => {
    const explicit = visible.some((c) => c.mobile);
    let metaCount = 0;
    return new Map(
      visible.map((c, i) => {
        if (explicit) return [c.id, c.mobile ?? 'hidden'] as const;
        if (i === 0) return [c.id, 'title' as MobileRole] as const;
        return [c.id, (metaCount++ < 2 ? 'meta' : 'hidden') as MobileRole] as const;
      }),
    );
  }, [visible]);

  const toolbar = (
    <div className="table-toolbar">
      {showPager ? <Pager {...pagerProps} compact={phone} /> : null}
      <span className="spacer" />
      {props.toolbarExtra}
      {columnMenu.length && !phone ? (
        <ActionMenu
          items={columnMenu}
          keepOpen
          label={t('table.selectColumns')}
          trigger={
            <>
              <Icon name="columns" size={15} />
              <span className="toolbar-label">{t('table.selectColumns')}</span>
            </>
          }
        />
      ) : null}
      {props.onRefresh ? (
        <button
          type="button"
          className="icon-btn"
          onClick={props.onRefresh}
          aria-label={t('common.refresh')}
          title={t('common.refresh')}
          disabled={props.loading}
        >
          <Icon name="refresh" />
        </button>
      ) : null}
      {props.onAdd ? (
        <button type="button" className="btn btn-primary btn-sm" onClick={props.onAdd}>
          <Icon name="plus" size={15} />
          {props.addLabel ?? t('common.add')}
        </button>
      ) : null}
    </div>
  );

  const loadingBlock = (
    <div className="center-fill" style={{ minHeight: 120 }}>
      <span className="spinner" aria-hidden="true" />
      {t('common.loading')}
    </div>
  );

  const cards = (
    <ul className="card-list" aria-label={props.caption}>
      {showLoading ? <li>{loadingBlock}</li> : null}
      {showEmpty ? <li>{props.empty}</li> : null}
      {!showLoading
        ? pageRows.map((row) => {
            const key = rowKey(row);
            const title = visible.find((c) => roles.get(c.id) === 'title');
            const badges = visible.filter((c) => roles.get(c.id) === 'badge');
            const metas = visible.filter((c) => roles.get(c.id) === 'meta');
            return (
              <li
                key={key}
                className={'row-card' + (props.onRowClick ? ' clickable' : '')}
                onClick={(event) => {
                  if (!props.onRowClick || ignoreRowClick(event.target, '.row-card')) return;
                  props.onRowClick(row);
                }}
              >
                <div className="row-card-head">
                  <div className="row-card-title">{title?.render(row)}</div>
                  {props.rowActions ? <ActionMenu items={props.rowActions(row)} /> : null}
                </div>
                {badges.length ? (
                  <div className="row-card-badges">
                    {badges.map((c) => (
                      <span key={c.id}>{c.render(row)}</span>
                    ))}
                  </div>
                ) : null}
                {metas.map((c) => (
                  <div key={c.id} className="row-card-meta">
                    <span className="row-card-label">{c.header}</span>
                    <span className="row-card-value">{c.render(row)}</span>
                  </div>
                ))}
              </li>
            );
          })
        : null}
    </ul>
  );

  const table = (
    <div className="table-scroll">
      <table className="data">
        {props.caption ? <caption className="sr-only">{props.caption}</caption> : null}
        <thead>
          <tr>
            {props.selectable ? (
              <th className="select-cell">
                <input
                  type="checkbox"
                  aria-label={t('table.selectAll')}
                  checked={allOnPage}
                  onChange={() => {
                    const next = new Set(selected);
                    for (const r of pageRows) {
                      if (allOnPage) next.delete(rowKey(r));
                      else next.add(rowKey(r));
                    }
                    setSelected(next);
                  }}
                />
              </th>
            ) : null}
            {visible.map((c) => {
              const active = sort?.id === c.id ? sort.dir : null;
              const sortable = !paging && !!c.sortValue;
              return (
                <th
                  key={c.id}
                  className={headerClass(c)}
                  aria-sort={active === 'asc' ? 'ascending' : active === 'desc' ? 'descending' : undefined}
                >
                  {sortable ? (
                    <button
                      type="button"
                      className="sort"
                      title={t('table.sortable', { column: c.header })}
                      onClick={() =>
                        setSort(
                          active === 'asc'
                            ? { id: c.id, dir: 'desc' }
                            : active === 'desc'
                              ? null
                              : { id: c.id, dir: 'asc' },
                        )
                      }
                    >
                      {c.header}
                      {active ? (
                        <Icon
                          name="chevronDown"
                          size={12}
                          className={active === 'asc' ? 'flip-v' : undefined}
                          label={t(active === 'asc' ? 'table.sortAscending' : 'table.sortDescending')}
                        />
                      ) : null}
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              );
            })}
            {props.rowActions ? (
              <th className="actions-cell">
                <span className="sr-only">{t('common.actions')}</span>
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {showLoading ? (
            <tr>
              <td colSpan={colSpan}>{loadingBlock}</td>
            </tr>
          ) : showEmpty ? (
            <tr>
              <td colSpan={colSpan}>{props.empty}</td>
            </tr>
          ) : (
            pageRows.map((row) => {
              const key = rowKey(row);
              return (
                <tr
                  key={key}
                  className={props.onRowClick ? 'clickable' : undefined}
                  onClick={(event) => {
                    if (!props.onRowClick || ignoreRowClick(event.target, 'tr')) return;
                    props.onRowClick(row);
                  }}
                >
                  {props.selectable ? (
                    <td className="select-cell">
                      <input
                        type="checkbox"
                        aria-label={t('table.selectRow')}
                        checked={selected.has(key)}
                        onChange={() => {
                          const next = new Set(selected);
                          if (next.has(key)) next.delete(key);
                          else next.add(key);
                          setSelected(next);
                        }}
                      />
                    </td>
                  ) : null}
                  {visible.map((c) => (
                    <td key={c.id} className={cellClass(c)}>
                      {c.render(row)}
                    </td>
                  ))}
                  {props.rowActions ? (
                    <td className="actions-cell">
                      <ActionMenu items={props.rowActions(row)} />
                    </td>
                  ) : null}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="table-frame">
      {toolbar}
      {props.filters ? <div className="table-filters">{props.filters}</div> : null}
      {props.notices ? <div className="table-notices">{props.notices}</div> : null}
      {props.selectable && selected.size > 0 ? (
        <div className="bulk-bar">
          <span>{t('table.selected', { count: selected.size })}</span>
          {props.bulkActions?.(selectedRows, clearSelection)}
          <button type="button" className="btn btn-sm btn-ghost" onClick={clearSelection}>
            {t('table.clearSelection')}
          </button>
        </div>
      ) : null}
      {props.error ? (
        <div style={{ padding: 12 }}>
          <ErrorBanner error={props.error} title={t('table.loadFailed')} onRetry={props.onRetry} />
        </div>
      ) : null}
      {phone ? cards : table}
    </div>
  );
}

/** Empty state: an icon in a soft circle, a short title, one sentence, and at most one action. */
export function EmptyState({
  title,
  body,
  action,
  icon,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
  icon?: string;
}) {
  return (
    <div className="empty">
      {icon ? (
        <span className="empty-icon" aria-hidden="true">
          <Icon name={icon} size={26} />
        </span>
      ) : null}
      <span className="empty-title">{title}</span>
      {body ? <span className="empty-body">{body}</span> : null}
      {action ? <div className="empty-action">{action}</div> : null}
    </div>
  );
}
