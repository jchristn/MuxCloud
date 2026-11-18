import fs from 'fs';
import path from 'path';
import { en as sharedEn, flattenKeys, LOCALES } from '@dashboard/i18n/catalog';
import { mobileResources } from '@/i18n/mobile';

const en = mobileResources.en;
const enKeys = flattenKeys(en).sort();

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const full = path.join(dir, d.name);
    if (d.isDirectory()) return d.name === '__tests__' ? [] : sourceFiles(full);
    return /\.(ts|tsx)$/.test(d.name) ? [full] : [];
  });
}

/** Keys passed literally to t('...') or i18nKey="..." anywhere in the app. */
function usedKeys(): string[] {
  const keys = new Set<string>();
  for (const file of sourceFiles(path.join(__dirname, '..'))) {
    const text = fs.readFileSync(file, 'utf8');
    for (const m of text.matchAll(/\bt\(\s*'([A-Za-z0-9_.]+)'/g)) keys.add(m[1]);
    for (const m of text.matchAll(/i18nKey="([A-Za-z0-9_.]+)"/g)) keys.add(m[1]);
  }
  return [...keys].filter((k) => !k.endsWith('.'));
}

describe('mobile i18n catalog', () => {
  it('has a catalog for every locale the shared registry lists', () => {
    for (const locale of LOCALES) expect(Object.keys(mobileResources)).toContain(locale.code);
  });

  it.each(Object.keys(mobileResources).filter((c) => c !== 'en'))('%s has exactly the English keys (no missing, no orphans)', (code) => {
    expect(flattenKeys(mobileResources[code]).sort()).toEqual(enKeys);
  });

  it.each(Object.keys(mobileResources).filter((c) => !c.startsWith('qps')))('%s keeps every {{interpolation}} of the English string', (code) => {
    const flat = (tree: object, prefix = ''): [string, string][] =>
      Object.entries(tree).flatMap(([k, v]) => (typeof v === 'string' ? [[prefix + k, v] as [string, string]] : flat(v as object, prefix + k + '.')));
    const target = new Map(flat(mobileResources[code]));
    for (const [key, value] of flat(en)) {
      const vars = (value.match(/\{\{\w+\}\}/g) ?? []).sort();
      expect([key, ((target.get(key) ?? '').match(/\{\{\w+\}\}/g) ?? []).sort()]).toEqual([key, vars]);
    }
  });

  it('defines every literal key the app uses, in the mobile or the shared catalog', () => {
    const mobile = new Set(enKeys.map((k) => 'mobile.' + k));
    const shared = new Set(flattenKeys(sharedEn));
    const missing = usedKeys().filter((k) => !mobile.has(k) && !shared.has(k));
    expect(missing).toEqual([]);
  });

  it('uses no em-dashes in any catalog', () => {
    for (const [code, catalog] of Object.entries(mobileResources)) {
      expect([code, JSON.stringify(catalog).includes(String.fromCharCode(0x2014))]).toEqual([code, false]);
    }
  });
});
