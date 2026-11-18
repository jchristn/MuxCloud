import { useTranslation } from 'react-i18next';
import { Link, NavLink } from 'react-router';
import { LanguageSelector } from '../../components/LanguageSelector';
import { Logo } from '../../components/Logo';
import { Markdown } from '../../components/Markdown';
import { ThemeToggle } from '../../components/ThemeToggle';
import { usePageTitle } from '../../context/PageTitleContext';
import accountDeletion from '../../legal/account-deletion.md?raw';
import privacy from '../../legal/privacy.md?raw';
import terms from '../../legal/terms.md?raw';

const DOCS = {
  terms: { source: terms, key: 'legal.terms' },
  privacy: { source: privacy, key: 'legal.privacy' },
  'account-deletion': { source: accountDeletion, key: 'legal.accountDeletion' },
} as const;

export type LegalDoc = keyof typeof DOCS;

/** Public legal documents. Published in English; the chrome is localized. */
export function LegalPage({ doc }: { doc: LegalDoc }) {
  const { t } = useTranslation();
  usePageTitle(t(DOCS[doc].key));
  return (
    <div className="legal-page">
      <div className="legal-nav">
        <Link to="/machines" aria-label={t('legal.backToApp')}>
          <Logo className="brand-logo" />
        </Link>
        {(Object.keys(DOCS) as LegalDoc[]).map((key) => (
          <NavLink key={key} to={'/legal/' + key}>
            {t(DOCS[key].key)}
          </NavLink>
        ))}
        <span style={{ flex: 1 }} />
        <LanguageSelector />
        <ThemeToggle />
      </div>
      <p className="small muted" style={{ marginBottom: 16 }}>
        {t('legal.englishGoverns')}
      </p>
      <article lang="en" dir="ltr">
        <Markdown source={DOCS[doc].source} />
      </article>
      <p style={{ marginTop: 32 }}>
        <Link to="/machines">{t('legal.backToApp')}</Link>
      </p>
    </div>
  );
}
