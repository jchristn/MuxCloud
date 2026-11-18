import { useCallback, useEffect, useRef, useState } from 'react';
import type { Page } from '../types';
import { usePersistentState } from './usePersistentState';

/**
 * Server-paged list state. `fetchPage` is re-run when the page, page size, or `filterKey` change; a filter change
 * resets to page 1. Out-of-order responses are dropped.
 */
export function usePaged<T>(
  tableId: string,
  fetchPage: (pageNumber: number, pageSize: number) => Promise<Page<T>>,
  filterKey: string,
) {
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = usePersistentState('muxcloud.table.' + tableId + '.pageSize', 25);
  const [data, setData] = useState<Page<T> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const generation = useRef(0);
  const fetchRef = useRef(fetchPage);
  fetchRef.current = fetchPage;
  const lastFilter = useRef(filterKey);

  const load = useCallback(async () => {
    const mine = ++generation.current;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchRef.current(pageNumber, pageSize);
      if (mine === generation.current) setData(result);
    } catch (e) {
      if (mine === generation.current) setError(e);
    } finally {
      if (mine === generation.current) setLoading(false);
    }
  }, [pageNumber, pageSize]);

  useEffect(() => {
    if (lastFilter.current !== filterKey) {
      lastFilter.current = filterKey;
      if (pageNumber !== 1) {
        setPageNumber(1);
        return;
      }
    }
    void load();
  }, [load, filterKey, pageNumber]);

  return {
    data,
    setData,
    loading,
    error,
    reload: load,
    paging: {
      pageNumber,
      pageSize,
      totalCount: data?.totalCount ?? 0,
      onPageChange: setPageNumber,
      onPageSizeChange: (size: number) => {
        setPageSize(size);
        setPageNumber(1);
      },
    },
  };
}
