import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocale } from '../i18n/runtime';
import { formatNumber } from '../lib/format';
import { PAGE_SIZES, clampPage, pageWindow } from '../lib/pagination';
import { Icon } from './Icon';

interface PagerProps {
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

/** "Showing 1-25 of 248", page size, first/previous/jump/next/last. */
export function Pager({ pageNumber, pageSize, totalCount, onPageChange, onPageSizeChange }: PagerProps) {
  const { t } = useTranslation();
  const locale = useLocale();
  const { first, last, totalPages } = pageWindow(pageNumber, pageSize, totalCount);
  const [jump, setJump] = useState(String(pageNumber));
  useEffect(() => setJump(String(pageNumber)), [pageNumber]);
  const go = (page: number) => onPageChange(clampPage(page, totalPages));
  const n = (v: number) => formatNumber(locale, v);
  return (
    <div className="pager">
      <span>
        {totalCount > 0
          ? t('table.showing', { first: n(first), last: n(last), total: n(totalCount) })
          : t('table.showingNone')}
      </span>
      <label className="row" style={{ gap: 4, marginInlineStart: 8 }}>
        <span className="sr-only">{t('table.pageSize')}</span>
        <select
          className="select"
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
      </label>
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
      <span>{t('table.pageOf', { page: n(pageNumber), pages: n(totalPages) })}</span>
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
    </div>
  );
}
