import { ar } from './ar';
import { de } from './de';
import { en, type MobileCatalog } from './en';
import { es } from './es';
import { fr } from './fr';
import { hi } from './hi';
import { it } from './it';
import { ja } from './ja';
import { ms } from './ms';
import { pt } from './pt';
import { ru } from './ru';
import { zh } from './zh';
import { expand, pseudoTree, rtl } from '@dashboard/i18n/catalog/pseudo';

export { en };
export type { MobileCatalog };

type Tree = { [key: string]: string | Tree };

/** The app's own strings per locale, including the two pseudo-locales derived from English. */
export const mobileResources: Record<string, MobileCatalog> = {
  en,
  es,
  pt,
  fr,
  it,
  de,
  zh,
  ar,
  ru,
  ms,
  hi,
  ja,
  'qps-ploc': pseudoTree(en as unknown as Tree, expand) as unknown as MobileCatalog,
  'qps-rtl': pseudoTree(en as unknown as Tree, rtl) as unknown as MobileCatalog,
};
