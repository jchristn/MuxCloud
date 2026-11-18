import { useTranslation } from 'react-i18next';
import { LOCALES } from '../i18n/catalog';
import { setLocale, showPseudoLocales, useLocale } from '../i18n/runtime';
import { Icon } from './Icon';

/** Language picker showing each language in its own script. */
export function LanguageSelector({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const pseudo = showPseudoLocales();
  return (
    <label className="row" style={{ gap: 6 }} title={t('shell.language')}>
      <Icon name="globe" size={16} />
      <span className="sr-only">{t('shell.language')}</span>
      <select
        className={'select' + (compact ? ' btn-sm' : '')}
        value={locale}
        onChange={(e) => void setLocale(e.target.value)}
        aria-label={t('shell.language')}
      >
        {LOCALES.filter((l) => !l.pseudo || pseudo).map((l) => (
          <option key={l.code} value={l.code} lang={l.code}>
            {l.nativeName}
          </option>
        ))}
      </select>
    </label>
  );
}
