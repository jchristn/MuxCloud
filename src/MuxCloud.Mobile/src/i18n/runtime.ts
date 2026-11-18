import { createInstance, type i18n as I18n } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager } from 'react-native';
import { getLocales } from 'expo-localization';
import { DEFAULT_LOCALE, isRtl, normalizeLocale, resources as sharedResources } from '@dashboard/i18n/catalog';
import { mobileResources } from './mobile';

/** Shared dashboard catalog plus the app's own `mobile.*` strings, per locale. */
export function buildResources(): Record<string, { translation: Record<string, unknown> }> {
  const out: Record<string, { translation: Record<string, unknown> }> = {};
  for (const [code, value] of Object.entries(sharedResources)) {
    out[code] = { translation: { ...(value.translation as unknown as Record<string, unknown>), mobile: mobileResources[code] ?? mobileResources.en } };
  }
  return out;
}

/** The device's preferred supported locale (I18N.md resolution: explicit choice, persisted, device, default). */
export function deviceLocale(): string {
  const first = getLocales()[0];
  return normalizeLocale(first?.languageTag ?? DEFAULT_LOCALE);
}

let instance: I18n | null = null;

/** Initialize the app's i18next instance once, or switch its language. */
export function initI18n(locale: string): I18n {
  if (!instance) {
    instance = createInstance();
    void instance.use(initReactI18next).init({
      resources: buildResources(),
      lng: locale,
      fallbackLng: DEFAULT_LOCALE,
      // i18next would turn "qps-ploc" into "qps-Ploc" (a script subtag) and miss the catalog; every code is lowercase.
      lowerCaseLng: true,
      interpolation: { escapeValue: false },
      returnNull: false,
    });
  } else if (instance.language !== locale) {
    void instance.changeLanguage(locale);
  }
  return instance;
}

/** Active UI language for Accept-Language, or null before initialization. */
export function currentLanguage(): string | null {
  return instance?.language ?? null;
}

/**
 * Layout direction follows the locale (Arabic and the RTL pseudo-locale). React Native applies a direction change on
 * the next launch, so this returns true when a restart is needed.
 */
export function applyDirection(locale: string): boolean {
  const rtl = isRtl(locale);
  I18nManager.allowRTL(true);
  if (I18nManager.isRTL !== rtl) {
    I18nManager.forceRTL(rtl);
    return true;
  }
  return false;
}
