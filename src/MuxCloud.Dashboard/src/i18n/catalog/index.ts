/**
 * Translation resources for every locale, in i18next's `{ [lng]: { translation } }` shape. Shared with the mobile
 * app: pure data, no DOM, storage, or i18next runtime.
 */
import { en, type Catalog } from './en';
import { expand, pseudoTree, rtl } from './pseudo';
import { TRANSLATIONS } from './translations';

export { en } from './en';
export type { Catalog } from './en';
export * from './locales';

type Tree = { [key: string]: string | Tree };

export const resources: Record<string, { translation: Catalog }> = {
  en: { translation: en },
  ...Object.fromEntries(Object.entries(TRANSLATIONS).map(([code, catalog]) => [code, { translation: catalog }])),
  'qps-ploc': { translation: pseudoTree(en as unknown as Tree, expand) as unknown as Catalog },
  'qps-rtl': { translation: pseudoTree(en as unknown as Tree, rtl) as unknown as Catalog },
};

/** Flatten a catalog to dotted keys, for completeness checks. */
export function flattenKeys(tree: object, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(tree)) {
    const full = prefix ? prefix + '.' + key : key;
    if (typeof value === 'string') keys.push(full);
    else keys.push(...flattenKeys(value as object, full));
  }
  return keys;
}
