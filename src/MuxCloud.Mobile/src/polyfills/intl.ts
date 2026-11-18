/**
 * Intl APIs the shared dashboard formatters use that Hermes does not implement (Intl.RelativeTimeFormat,
 * Intl.ListFormat, and their prerequisites Intl.Locale and Intl.PluralRules). Each polyfill installs only when the
 * engine lacks the feature, so the cost is zero where it is native. Imported first by src/app/_layout.tsx.
 * Locale data covers every catalog locale; the pseudo-locales fall back to English.
 */
import '@formatjs/intl-getcanonicallocales/polyfill.js';
import '@formatjs/intl-locale/polyfill.js';
import '@formatjs/intl-pluralrules/polyfill.js';
import '@formatjs/intl-pluralrules/locale-data/en.js';
import '@formatjs/intl-pluralrules/locale-data/es.js';
import '@formatjs/intl-pluralrules/locale-data/pt.js';
import '@formatjs/intl-pluralrules/locale-data/fr.js';
import '@formatjs/intl-pluralrules/locale-data/it.js';
import '@formatjs/intl-pluralrules/locale-data/de.js';
import '@formatjs/intl-pluralrules/locale-data/zh.js';
import '@formatjs/intl-pluralrules/locale-data/ar.js';
import '@formatjs/intl-pluralrules/locale-data/ru.js';
import '@formatjs/intl-pluralrules/locale-data/ms.js';
import '@formatjs/intl-pluralrules/locale-data/hi.js';
import '@formatjs/intl-pluralrules/locale-data/ja.js';
import '@formatjs/intl-relativetimeformat/polyfill.js';
import '@formatjs/intl-relativetimeformat/locale-data/en.js';
import '@formatjs/intl-relativetimeformat/locale-data/es.js';
import '@formatjs/intl-relativetimeformat/locale-data/pt.js';
import '@formatjs/intl-relativetimeformat/locale-data/fr.js';
import '@formatjs/intl-relativetimeformat/locale-data/it.js';
import '@formatjs/intl-relativetimeformat/locale-data/de.js';
import '@formatjs/intl-relativetimeformat/locale-data/zh.js';
import '@formatjs/intl-relativetimeformat/locale-data/ar.js';
import '@formatjs/intl-relativetimeformat/locale-data/ru.js';
import '@formatjs/intl-relativetimeformat/locale-data/ms.js';
import '@formatjs/intl-relativetimeformat/locale-data/hi.js';
import '@formatjs/intl-relativetimeformat/locale-data/ja.js';
import '@formatjs/intl-listformat/polyfill.js';
import '@formatjs/intl-listformat/locale-data/en.js';
import '@formatjs/intl-listformat/locale-data/es.js';
import '@formatjs/intl-listformat/locale-data/pt.js';
import '@formatjs/intl-listformat/locale-data/fr.js';
import '@formatjs/intl-listformat/locale-data/it.js';
import '@formatjs/intl-listformat/locale-data/de.js';
import '@formatjs/intl-listformat/locale-data/zh.js';
import '@formatjs/intl-listformat/locale-data/ar.js';
import '@formatjs/intl-listformat/locale-data/ru.js';
import '@formatjs/intl-listformat/locale-data/ms.js';
import '@formatjs/intl-listformat/locale-data/hi.js';
import '@formatjs/intl-listformat/locale-data/ja.js';
