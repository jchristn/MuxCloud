/** Page math for table toolbars: "Showing 1-25 of 248. Page 1 of 10." */
export interface PageWindow {
  first: number;
  last: number;
  totalPages: number;
}

export const PAGE_SIZES = [10, 25, 50, 100, 250, 500, 1000];

export function pageWindow(pageNumber: number, pageSize: number, totalCount: number): PageWindow {
  const totalPages = Math.max(1, Math.ceil(totalCount / Math.max(1, pageSize)));
  if (totalCount <= 0) return { first: 0, last: 0, totalPages };
  const first = (pageNumber - 1) * pageSize + 1;
  const last = Math.min(totalCount, pageNumber * pageSize);
  return { first, last, totalPages };
}

/** Clamp a requested page into range. */
export function clampPage(pageNumber: number, totalPages: number): number {
  if (!Number.isFinite(pageNumber)) return 1;
  return Math.min(Math.max(1, Math.trunc(pageNumber)), Math.max(1, totalPages));
}

/** Client-side page of an already loaded list. */
export function slicePage<T>(items: T[], pageNumber: number, pageSize: number): T[] {
  const start = (pageNumber - 1) * pageSize;
  return items.slice(start, start + pageSize);
}
