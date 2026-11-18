/** Build a query string from defined values. Booleans and numbers are stringified; undefined, null, and '' are skipped. */
export function buildQuery(params: object | undefined): string {
  if (!params) return '';
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
    if (value === undefined || value === null || value === '') continue;
    parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(String(value)));
  }
  return parts.length ? '?' + parts.join('&') : '';
}
