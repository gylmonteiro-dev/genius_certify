import React from 'react';
import { PAGE_SIZE_OPTIONS } from '../lib/pagination';
import { useT } from '../i18n';

interface TablePaginationProps {
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
  start: number;
  end: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export const TablePagination: React.FC<TablePaginationProps> = ({
  page,
  pageCount,
  pageSize,
  total,
  start,
  end,
  onPageChange,
  onPageSizeChange,
}) => {
  const { t } = useT();
  if (total === 0) return null;

  return (
    <div className="px-4 py-3 border-t border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <p className="text-xs text-slate-500">
        {t('common.showingRange', { start: start + 1, end, total })}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-slate-500">
          <span className="whitespace-nowrap">{t('common.perPage')}</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="bg-white border border-slate-200 rounded-md px-2 py-1 text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="p-1.5 rounded-md text-slate-500 hover:bg-white hover:text-slate-800 disabled:opacity-40 disabled:hover:bg-transparent"
            title={t('common.previous')}
            aria-label={t('common.previous')}
          >
            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
          </button>
          <span className="min-w-[7rem] text-center text-xs font-medium text-slate-600">
            {t('common.pageOf', { page, pages: pageCount })}
          </span>
          <button
            type="button"
            disabled={page >= pageCount}
            onClick={() => onPageChange(page + 1)}
            className="p-1.5 rounded-md text-slate-500 hover:bg-white hover:text-slate-800 disabled:opacity-40 disabled:hover:bg-transparent"
            title={t('common.next')}
            aria-label={t('common.next')}
          >
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>
        </div>
      </div>
    </div>
  );
};
