/** Locale registry (I18N.md "Recommended Target Languages"). Shared with the mobile app. */
export interface LocaleMeta {
  code: string;
  englishName: string;
  nativeName: string;
  dir: 'ltr' | 'rtl';
  fallback: string;
  /** Pseudo-locales are for testing and are hidden from the picker unless test locales are enabled. */
  pseudo?: boolean;
}

export const STORAGE_KEY = 'muxcloud.locale';
export const DEFAULT_LOCALE = 'en';

export const LOCALES: LocaleMeta[] = [
  { code: 'en', englishName: 'English', nativeName: 'English', dir: 'ltr', fallback: 'en' },
  { code: 'es', englishName: 'Spanish', nativeName: 'Español', dir: 'ltr', fallback: 'en' },
  { code: 'pt', englishName: 'Portuguese', nativeName: 'Português', dir: 'ltr', fallback: 'en' },
  { code: 'fr', englishName: 'French', nativeName: 'Français', dir: 'ltr', fallback: 'en' },
  { code: 'it', englishName: 'Italian', nativeName: 'Italiano', dir: 'ltr', fallback: 'en' },
  { code: 'de', englishName: 'German', nativeName: 'Deutsch', dir: 'ltr', fallback: 'en' },
  { code: 'zh', englishName: 'Mandarin Chinese', nativeName: '中文', dir: 'ltr', fallback: 'en' },
  { code: 'ar', englishName: 'Arabic', nativeName: 'العربية', dir: 'rtl', fallback: 'en' },
  { code: 'ru', englishName: 'Russian', nativeName: 'Русский', dir: 'ltr', fallback: 'en' },
  { code: 'ms', englishName: 'Malay', nativeName: 'Bahasa Melayu', dir: 'ltr', fallback: 'en' },
  { code: 'hi', englishName: 'Hindi', nativeName: 'हिन्दी', dir: 'ltr', fallback: 'en' },
  { code: 'ja', englishName: 'Japanese', nativeName: '日本語', dir: 'ltr', fallback: 'en' },
  { code: 'qps-ploc', englishName: 'Pseudo (expansion)', nativeName: 'Ƥşḗŭḓǿ', dir: 'ltr', fallback: 'en', pseudo: true },
  { code: 'qps-rtl', englishName: 'Pseudo (RTL)', nativeName: 'Pseudo RTL', dir: 'rtl', fallback: 'en', pseudo: true },
];

const ALIASES: Record<string, string> = {
  'zh-cn': 'zh',
  'zh-hans': 'zh',
  'zh-sg': 'zh',
  'pt-br': 'pt',
  'pt-pt': 'pt',
  kanji: 'ja',
};

/** Map any BCP 47 tag to a supported locale code, or the default. */
export function normalizeLocale(tag: string | null | undefined): string {
  if (!tag) return DEFAULT_LOCALE;
  const lower = tag.trim().toLowerCase();
  const exact = LOCALES.find((l) => l.code.toLowerCase() === lower);
  if (exact) return exact.code;
  if (ALIASES[lower]) return ALIASES[lower];
  const base = lower.split(/[-_]/)[0];
  if (ALIASES[base]) return ALIASES[base];
  return LOCALES.find((l) => l.code === base && !l.pseudo)?.code ?? DEFAULT_LOCALE;
}

export function localeMeta(code: string): LocaleMeta {
  return LOCALES.find((l) => l.code === code) ?? LOCALES[0];
}

export function isRtl(code: string): boolean {
  return localeMeta(code).dir === 'rtl';
}
