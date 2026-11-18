import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocale } from '../i18n/runtime';
import { formatNumber } from '../lib/format';
import { PAGE_SIZES, clampPage, pageWindow } from '../lib/pagination';
import { Icon } from './Icon';

export interface PagerProps {
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  /** Phone layout: previous, "1-25 of 248", next. */
  compact?: boolean;
}

/** Whether a list spans more than one page (pagination is hidden otherwise). */
export function needsPaging(pageNumber: number, pageSize: number, totalCount: number): boolean {
  return pageNumber > 1 || totalCount > pageSize;
}

/** "Showing 1-25 of 248", page size, first/previous/jump/next/last; or a compact previous/next on phones. */
export function Pager({ pageNumber, pageSize, totalCount, onPageChange, onPageSizeChange, compact }: PagerProps) {
  const { t } = useTranslation();
  const locale = useLocale();
  const { first, last, totalPages } = pageWindow(pageNumber, pageSize, totalCount);
  const [jump, setJump] = useState(String(pageNumber));
  useEffect(() => setJump(String(pageNumber)), [pageNumber]);
  const go = (page: number) => onPageChange(clampPage(page, totalPages));
  const n = (v: number) => formatNumber(locale, v);

  const prev = (
    <button
      type="button"
      className="icon-btn sm"
      onClick={() => go(pageNumber - 1)}
      disabled={pageNumber <= 1}
      aria-label={t('table.previousPage')}
      title={t('table.previousPage')}
    >
      <Icon name="chevronLeft" size={16} className="flip-rtl" />
    </button>
  );
  const next = (
    <button
      type="button"
      className="icon-btn sm"
      onClick={() => go(pageNumber + 1)}
      disabled={pageNumber >= totalPages}
      aria-label={t('table.nextPage')}
      title={t('table.nextPage')}
    >
      <Icon name="chevronRight" size={16} className="flip-rtl" />
    </button>
  );

  if (compact) {
    return (
      <div className="pager pager-compact">
        {prev}
        <span className="pager-range">
          {t('table.range', { first: n(first), last: n(last), total: n(totalCount) })}
        </span>
        {next}
      </div>
    );
  }

  return (
    <div className="pager">
      <span className="pager-range">
        {totalCount > 0
          ? t('table.showing', { first: n(first), last: n(last), total: n(totalCount) })
          : t('table.showingNone')}
      </span>
      <select
        className="select select-sm"
        value={pageSize}
        onChange={(e) => onPageSizeChange(Number(e.target.value))}
        aria-label={t('table.pageSize')}
        title={t('table.pageSize')}
      >
        {PAGE_SIZES.map((size) => (
          <option key={size} value={size}>
            {n(size)}
          </option>
        ))}
      </select>
      <span className="pager-nav">
        <button
          type="button"
          className="icon-btn sm"
          onClick={() => go(1)}
          disabled={pageNumber <= 1}
          aria-label={t('table.firstPage')}
          title={t('table.firstPage')}
        >
          <Icon name="chevronsLeft" size={16} className="flip-rtl" />
        </button>
        {prev}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            go(Number(jump));
          }}
        >
          <input
            className="input page-input"
            inputMode="numeric"
            value={jump}
            onChange={(e) => setJump(e.target.value)}
            onBlur={() => go(Number(jump))}
            aria-label={t('table.jumpToPage')}
            title={t('table.jumpToPage')}
          />
        </form>
        <span className="pager-of">{t('table.pageOf', { page: n(pageNumber), pages: n(totalPages) })}</span>
        {next}
        <button
          type="button"
          className="icon-btn sm"
          onClick={() => go(totalPages)}
          disabled={pageNumber >= totalPages}
          aria-label={t('table.lastPage')}
          title={t('table.lastPage')}
        >
          <Icon name="chevronsRight" size={16} className="flip-rtl" />
        </button>
      </span>
    </div>
  );
}
