import { describe, expect, it } from 'vitest';
import { en, flattenKeys, isRtl, normalizeLocale, resources, LOCALES } from './index';

describe('catalog', () => {
  it('normalizes locale tags', () => {
    expect(normalizeLocale('de-AT')).toBe('de');
    expect(normalizeLocale('pt-BR')).toBe('pt');
    expect(normalizeLocale('zh-Hans-CN')).toBe('zh');
    expect(normalizeLocale('kanji')).toBe('ja');
    expect(normalizeLocale('xx')).toBe('en');
    expect(normalizeLocale(null)).toBe('en');
    expect(isRtl('ar')).toBe(true);
  });
  it('has a resource for every registered locale with the same keys as English', () => {
    const keys = flattenKeys(en).sort();
    for (const locale of LOCALES) {
      const catalog = resources[locale.code];
      expect(catalog, locale.code).toBeDefined();
      expect(flattenKeys(catalog.translation).sort(), locale.code).toEqual(keys);
    }
  });
  it('pseudo-locales keep interpolation tokens', () => {
    const value = resources['qps-ploc'].translation.machines.connectionsTitle;
    expect(value).toContain('{{name}}');
    expect(value.length).toBeGreaterThan(en.machines.connectionsTitle.length);
  });
});
