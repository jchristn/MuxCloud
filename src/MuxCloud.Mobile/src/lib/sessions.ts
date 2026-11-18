import type { MuxSessionSummary } from '@/types/mux';

/** Filter sessions by a search term and by an exact label or tag ("key=value"). Exported for tests. */
export function filterSessions(sessions: MuxSessionSummary[], search: string, facet: string): MuxSessionSummary[] {
  const term = search.trim().toLowerCase();
  return sessions
    .filter((s) => {
      if (facet) {
        const labelHit = (s.Labels ?? []).includes(facet);
        const tagHit = (s.Tags ?? []).some((tg) => tg.Key + '=' + tg.Value === facet);
        if (!labelHit && !tagHit) return false;
      }
      if (!term) return true;
      return [s.Title, s.Model, s.EndpointName, s.WorkingDirectory, ...(s.Labels ?? []), ...(s.Tags ?? []).map((tg) => tg.Key + ' ' + tg.Value)]
        .join(' ')
        .toLowerCase()
        .includes(term);
    })
    .sort((a, b) => (b.UpdatedUtc ?? b.CreatedUtc ?? '').localeCompare(a.UpdatedUtc ?? a.CreatedUtc ?? ''));
}

/** Labels and tags present across sessions, as filter chips. */
export function facetsOf(sessions: MuxSessionSummary[]): string[] {
  const set = new Set<string>();
  for (const s of sessions) {
    for (const l of s.Labels ?? []) set.add(l);
    for (const tg of s.Tags ?? []) set.add(tg.Key + '=' + tg.Value);
  }
  return [...set].sort();
}

/** Last path segment of a working folder ("/Users/me/src/acme-api/" becomes "acme-api"), for compact rows. */
export function folderName(path: string | undefined): string {
  const trimmed = (path ?? '').replace(/[\\/]+$/, '');
  const parts = trimmed.split(/[\\/]/);
  return parts[parts.length - 1] || trimmed;
}
