import type { Catalog } from './en';
import { ar } from './locales/ar';
import { de } from './locales/de';
import { es } from './locales/es';
import { fr } from './locales/fr';
import { hi } from './locales/hi';
import { it } from './locales/it';
import { ja } from './locales/ja';
import { ms } from './locales/ms';
import { pt } from './locales/pt';
import { ru } from './locales/ru';
import { zh } from './locales/zh';

/** Translated catalogs, keyed by locale code. English is the source and is not listed here. */
export const TRANSLATIONS: Record<string, Catalog> = { es, pt, fr, it, de, zh, ar, ru, ms, hi, ja };
