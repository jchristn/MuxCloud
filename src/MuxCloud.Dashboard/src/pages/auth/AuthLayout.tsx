import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { LanguageSelector } from '../../components/LanguageSelector';
import { Logo } from '../../components/Logo';
import { ThemeToggle } from '../../components/ThemeToggle';
import { usePageTitle } from '../../context/PageTitleContext';

/** Public auth page frame: brand, card, language and theme, legal links. */
export function AuthLayout({
  title,
  pageTitle,
  subtitle,
  children,
  footer,
}: {
  title: string;
  pageTitle: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { t } = useTranslation();
  usePageTitle(pageTitle);
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <Logo />
          <span className="tagline">{t('auth.tagline')}</span>
        </div>
        <div>
          <h1>{title}</h1>
          {subtitle ? (
            <p className="muted small" style={{ marginTop: 4 }}>
              {subtitle}
            </p>
          ) : null}
        </div>
        {children}
        {footer ? <div className="auth-links">{footer}</div> : null}
      </div>
      <div className="auth-utility">
        <LanguageSelector compact />
        <ThemeToggle />
      </div>
      <div className="auth-utility muted">
        <Link to="/legal/terms">{t('legal.terms')}</Link>
        <span aria-hidden="true">|</span>
        <Link to="/legal/privacy">{t('legal.privacy')}</Link>
      </div>
    </div>
  );
}
