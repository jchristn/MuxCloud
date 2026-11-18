/** "ToolAutoApproveSeconds" becomes "Tool auto approve seconds"; "McpPath" becomes "Mcp path". */
export function humanize(key: string): string {
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/);
  return words.map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : /^[A-Z0-9]+$/.test(w) && w.length > 1 ? w : w.toLowerCase())).join(' ');
}

/** Empty copy of an object's shape, for adding a sibling element. */
export function templateFrom(sample: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!sample) return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(sample)) {
    if (typeof v === 'boolean') out[k] = false;
    else if (typeof v === 'number') out[k] = 0;
    else if (Array.isArray(v)) out[k] = [];
    else if (v !== null && typeof v === 'object') out[k] = templateFrom(v as Record<string, unknown>);
    else out[k] = typeof v === 'string' ? '' : null;
  }
  return out;
}
