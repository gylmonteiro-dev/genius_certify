import { useEffect, useMemo, useState } from 'react';

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 25;

export function usePagedList<T>(items: T[], resetKey: unknown, defaultSize = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultSize);

  useEffect(() => {
    setPage(1);
  }, [resetKey, pageSize]);

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize) || 1);
  const currentPage = Math.min(page, pageCount);
  const start = items.length === 0 ? 0 : (currentPage - 1) * pageSize;
  const pageItems = useMemo(
    () => items.slice(start, start + pageSize),
    [items, start, pageSize],
  );

  return {
    page: currentPage,
    setPage,
    pageSize,
    setPageSize,
    pageCount,
    pageItems,
    start,
    end: start + pageItems.length,
    total: items.length,
  };
}
