import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { LanguageSelector } from '../../components/LanguageSelector';
import { Logo } from '../../components/Logo';
import { ThemeToggle } from '../../components/ThemeToggle';
import { usePageTitle } from '../../context/PageTitleContext';

/** Public auth page frame: utility bar, centered branded card, legal footer. */
export function AuthLayout({
  title,
  pageTitle,
  subtitle,
  children,
  footer,
  icon,
  centered = false,
}: {
  title: string;
  pageTitle: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Shown above a centered heading on confirmation screens. */
  icon?: ReactNode;
  /** Center the heading, for confirmation screens such as "Check your email". */
  centered?: boolean;
}) {
  const { t } = useTranslation();
  usePageTitle(pageTitle);
  return (
    <div className="auth-page">
      <div className="auth-utility">
        <LanguageSelector />
        <ThemeToggle />
      </div>
      <main className="auth-main">
        <div className="auth-card">
          <div className="auth-brand">
            <span className="auth-wordmark">
              <Logo className="auth-logo" green />
              <span className="pill pill-accent">{t('common.cloud')}</span>
            </span>
            <span className="tagline">{t('auth.tagline')}</span>
          </div>
          <div className={'auth-heading' + (centered ? ' auth-heading-centered' : '')}>
            {icon}
            <h1>{title}</h1>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          {children}
          {footer ? <div className="auth-links">{footer}</div> : null}
        </div>
      </main>
      <footer className="auth-legal">
        <Link to="/legal/terms">{t('legal.terms')}</Link>
        <span aria-hidden="true">·</span>
        <Link to="/legal/privacy">{t('legal.privacy')}</Link>
      </footer>
    </div>
  );
}

/** A labeled field with its inline error or hint, wired for screen readers. */
export function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string | null;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {error ? (
        <span id={id + '-msg'} className="field-error" role="alert">
          {error}
        </span>
      ) : hint ? (
        <span id={id + '-msg'} className="field-hint">
          {hint}
        </span>
      ) : null}
    </div>
  );
}
