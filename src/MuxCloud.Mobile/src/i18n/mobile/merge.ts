type Tree = { [key: string]: string | Tree };

/** Deep-merges a catalog extension into a base catalog: nested sections combine, strings in `extra` win. */
export function mergeCatalog<A extends object, B extends object>(base: A, extra: B): A & B {
  const out: Tree = { ...(base as unknown as Tree) };
  for (const [key, value] of Object.entries(extra as unknown as Tree)) {
    const current = out[key];
    out[key] = typeof value === 'object' && typeof current === 'object' ? mergeCatalog(current, value) : value;
  }
  return out as unknown as A & B;
}
