/**
 * Dashboard-only i18n runtime: i18next initialization, browser detection and persistence, and <html lang dir>
 * synchronization. The catalogs themselves are shared (./catalog).
 */
import i18next from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next, useTranslation } from 'react-i18next';
import { DEFAULT_LOCALE, LOCALES, STORAGE_KEY, localeMeta, normalizeLocale, resources } from './catalog';

let initialized = false;

/** Initialize before the first render so there is no fallback-language flash. */
export function initI18n(): typeof i18next {
  if (initialized) return i18next;
  initialized = true;
  void i18next
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      fallbackLng: DEFAULT_LOCALE,
      supportedLngs: LOCALES.map((l) => l.code),
      nonExplicitSupportedLngs: false,
      load: 'currentOnly',
      // Keep codes exactly as registered: otherwise i18next title-cases 4-letter subtags (qps-ploc becomes qps-Ploc).
      lowerCaseLng: true,
      interpolation: { escapeValue: false },
      returnNull: false,
      initAsync: false,
      detection: {
        order: ['querystring', 'localStorage', 'navigator'],
        lookupQuerystring: 'lang',
        lookupLocalStorage: STORAGE_KEY,
        caches: ['localStorage'],
        convertDetectedLanguage: (lng: string) => normalizeLocale(lng),
      },
    });
  applyDocumentLocale(i18next.language);
  i18next.on('languageChanged', applyDocumentLocale);
  return i18next;
}

function applyDocumentLocale(code: string): void {
  const meta = localeMeta(normalizeLocale(code));
  document.documentElement.lang = meta.code;
  document.documentElement.dir = meta.dir;
}

/** Change and persist the active locale. */
export async function setLocale(code: string): Promise<void> {
  const normalized = normalizeLocale(code);
  try {
    localStorage.setItem(STORAGE_KEY, normalized);
  } catch {
    // Storage may be unavailable (private mode); the change still applies for this page.
  }
  await i18next.changeLanguage(normalized);
}

/** The active locale code, re-rendering on change. */
export function useLocale(): string {
  const { i18n } = useTranslation();
  return normalizeLocale(i18n.resolvedLanguage ?? i18n.language);
}

/** Whether test pseudo-locales appear in the picker (`?pseudo=1` or a stored flag). */
export function showPseudoLocales(): boolean {
  try {
    if (new URLSearchParams(window.location.search).get('pseudo') === '1') localStorage.setItem('muxcloud.pseudo', '1');
    return localStorage.getItem('muxcloud.pseudo') === '1';
  } catch {
    return false;
  }
}

export { i18next };
