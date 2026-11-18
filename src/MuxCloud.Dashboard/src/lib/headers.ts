/**
 * Captured HTTP headers as sorted [name, value] pairs. Accepts the API's name to value object and, defensively, the
 * older "Name: value" text lines or a JSON string of either, so a string is never iterated character by character.
 */
export function headerEntries(value: unknown): [string, string][] {
  if (value == null) return [];
  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) return [];
    if (text.startsWith('{')) {
      try {
        return headerEntries(JSON.parse(text));
      } catch {
        // Fall through to line parsing.
      }
    }
    const pairs: [string, string][] = [];
    for (const raw of text.split('\n')) {
      const line = raw.replace(/\r$/, '');
      const colon = line.indexOf(':');
      if (colon <= 0) continue;
      pairs.push([line.slice(0, colon).trim(), line.slice(colon + 1).trim()]);
    }
    return sortPairs(pairs);
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    return sortPairs(
      Object.entries(value as Record<string, unknown>).map(
        ([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)] as [string, string],
      ),
    );
  }
  return [];
}

function sortPairs(pairs: [string, string][]): [string, string][] {
  return pairs.sort((a, b) => a[0].localeCompare(b[0], 'en', { sensitivity: 'base' }));
}
