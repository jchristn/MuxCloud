import { useTranslation } from 'react-i18next';
import { LOCALES } from '../i18n/catalog';
import { setLocale, showPseudoLocales, useLocale } from '../i18n/runtime';
import { ActionMenu } from './ActionMenu';
import { Icon } from './Icon';

/**
 * Compact language picker: a globe button showing the current language code, opening a menu of languages in their
 * own scripts. `variant="sidebar"` fits the dark navigation drawer.
 */
export function LanguageSelector({ variant = 'default' }: { variant?: 'default' | 'sidebar' }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const current = LOCALES.find((l) => l.code === locale);
  const items = LOCALES.filter((l) => !l.pseudo || showPseudoLocales()).map((l) => ({
    label: l.nativeName,
    lang: l.code,
    checked: l.code === locale,
    onSelect: () => void setLocale(l.code),
  }));
  return (
    <ActionMenu
      items={items}
      label={t('shell.language')}
      triggerClassName={variant === 'sidebar' ? 'lang-trigger lang-trigger-sidebar' : 'lang-trigger'}
      trigger={
        <>
          <Icon name="globe" size={16} />
          <span className="lang-code" lang={locale}>
            {variant === 'sidebar' ? current?.nativeName : locale.split('-')[0].toUpperCase()}
          </span>
        </>
      }
    />
  );
}
