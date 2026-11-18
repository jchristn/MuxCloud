import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../../api';
import { api } from '../../apiClient';
import { Banner } from '../../components/Banner';
import { CodeBlock } from '../../components/CodeBlock';
import { Collapsible } from '../../components/Collapsible';
import { ErrorBanner } from '../../components/ErrorBanner';
import { PageHeader } from '../../components/PageHeader';
import { Loading } from '../../components/Spinner';
import { usePageTitle } from '../../context/PageTitleContext';
import { useToast } from '../../context/ToastContext';
import type { AdminSettings } from '../../types';

/** "rest.port" -> "Port"; camelCase and PascalCase become words. */
function humanize(key: string): string {
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_.-]+/g, ' ')
    .trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function isOverridden(overrides: string[], path: string): boolean {
  return overrides.some((o) => o.toLowerCase() === path.toLowerCase());
}

function FieldValue({ path, value, overrides }: { path: string; value: unknown; overrides: string[] }) {
  const { t } = useTranslation();
  const env = isOverridden(overrides, path);
  let control;
  if (value === '(set)' || value === '(not set)') {
    control = (
      <span className={'pill ' + (value === '(set)' ? 'pill-success' : '')}>
        {value === '(set)' ? t('admin.secretSet') : t('admin.secretNotSet')}
      </span>
    );
  } else if (typeof value === 'boolean') {
    control = (
      <label className="checkbox">
        <input type="checkbox" checked={value} disabled readOnly />
        <span>{value ? t('common.enabled') : t('common.disabled')}</span>
      </label>
    );
  } else if (Array.isArray(value)) {
    control = (
      <input
        className="input mono"
        value={value.map((v) => (typeof v === 'object' ? JSON.stringify(v) : String(v))).join(', ')}
        disabled
        readOnly
      />
    );
  } else {
    control = (
      <input
        className="input mono"
        value={value === null || value === undefined ? '' : String(value)}
        disabled
        readOnly
        type={typeof value === 'number' ? 'number' : 'text'}
      />
    );
  }
  return (
    <div className="field">
      <span className="field-label row">
        {humanize(path.split('.').pop() ?? path)}
        {env ? <span className="pill pill-info">{t('admin.envOverride')}</span> : null}
      </span>
      {control}
      <span className="field-hint mono">{path}</span>
    </div>
  );
}

function Section({ name, value, overrides }: { name: string; value: Record<string, unknown>; overrides: string[] }) {
  const scalars = Object.entries(value).filter(([, v]) => v === null || typeof v !== 'object' || Array.isArray(v));
  const nested = Object.entries(value).filter(([, v]) => v !== null && typeof v === 'object' && !Array.isArray(v));
  return (
    <fieldset className="panel form-stack" style={{ margin: 0 }}>
      <legend className="section-title">{humanize(name)}</legend>
      {scalars.length ? (
        <div className="form-grid">
          {scalars.map(([k, v]) => (
            <FieldValue key={k} path={name + '.' + k} value={v} overrides={overrides} />
          ))}
        </div>
      ) : null}
      {nested.map(([k, v]) => (
        <Section key={k} name={name + '.' + k} value={v as Record<string, unknown>} overrides={overrides} />
      ))}
    </fieldset>
  );
}

export function SettingsPage() {
  const { t } = useTranslation();
  const toast = useToast();
  usePageTitle(t('admin.settingsTitle'));
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [to, setTo] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setSettings(await adminApi.settings(api));
    } catch (e) {
      setError(e);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sendTest = async (event: FormEvent) => {
    event.preventDefault();
    setSending(true);
    try {
      await adminApi.testEmail(api, to.trim());
      toast.success(t('admin.testEmailSent', { to: to.trim() }));
    } catch (e) {
      toast.error(e);
    } finally {
      setSending(false);
    }
  };

  const overrides = settings?.environmentOverrides ?? [];
  const entries = Object.entries(settings ?? {}).filter(([k]) => k !== 'environmentOverrides');
  const top = entries.filter(([, v]) => v === null || typeof v !== 'object' || Array.isArray(v));
  const sections = entries.filter(([, v]) => v !== null && typeof v === 'object' && !Array.isArray(v));

  return (
    <div className="page">
      <PageHeader title={t('admin.settingsTitle')} subtitle={t('admin.settingsSubtitle')} />
      <Banner tone="info">{t('admin.settingsReadOnly')}</Banner>
      {error ? <ErrorBanner error={error} onRetry={load} /> : null}
      {!settings && !error ? <Loading /> : null}
      {top.length ? (
        <div className="panel form-grid">
          {top.map(([k, v]) => (
            <FieldValue key={k} path={k} value={v} overrides={overrides} />
          ))}
        </div>
      ) : null}
      {sections.map(([k, v]) => (
        <Section key={k} name={k} value={v as Record<string, unknown>} overrides={overrides} />
      ))}
      <section className="section panel">
        <h2 className="section-title">{t('admin.testEmail')}</h2>
        <form className="row" style={{ alignItems: 'flex-end' }} onSubmit={sendTest}>
          <div className="field" style={{ flex: 1, minWidth: 220 }}>
            <label htmlFor="test-to">{t('admin.testEmailTo')}</label>
            <input id="test-to" className="input" type="email" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={sending || !to.includes('@')}>
            {t('admin.testEmail')}
          </button>
        </form>
      </section>
      {settings ? (
        <Collapsible title={t('admin.rawSettings')} copyValue={JSON.stringify(settings, null, 2)} defaultOpen={false}>
          <CodeBlock text={JSON.stringify(settings, null, 2)} />
        </Collapsible>
      ) : null}
    </div>
  );
}
