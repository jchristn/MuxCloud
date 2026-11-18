import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { accountApi } from '../../api';
import { api } from '../../apiClient';
import { ConfirmModal } from '../../components/ConfirmModal';
import { CopyableId } from '../../components/CopyButton';
import { DataTable, EmptyState, type Column } from '../../components/DataTable';
import { ErrorBanner } from '../../components/ErrorBanner';
import { JsonViewerModal } from '../../components/JsonViewerModal';
import { PageHeader } from '../../components/PageHeader';
import { PasswordInput } from '../../components/PasswordInput';
import { useAuth } from '../../context/AuthContext';
import { usePageTitle } from '../../context/PageTitleContext';
import { useToast } from '../../context/ToastContext';
import { useLocale } from '../../i18n/runtime';
import { formatDate, formatDateTime, formatRelativeTime } from '../../lib/format';
import type { AuthSession, Page } from '../../types';

function ProfileSection() {
  const { t } = useTranslation();
  const locale = useLocale();
  const toast = useToast();
  const { user, setUser } = useAuth();
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  if (!user) return null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setUser(await accountApi.update(api, { firstName: firstName.trim(), lastName: lastName.trim() }));
      toast.success(t('account.profileSaved'));
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="section panel">
      <h2 className="section-title">{t('account.profile')}</h2>
      {error ? <ErrorBanner error={error} /> : null}
      <form className="form-stack" onSubmit={submit}>
        <dl className="kv">
          <dt>{t('account.emailFixed')}</dt>
          <dd className="row">
            {user.email}
            <span className={'pill ' + (user.emailVerified ? 'pill-success' : 'pill-warning')}>
              {user.emailVerified ? t('account.emailVerified') : t('account.emailUnverified')}
            </span>
          </dd>
          <dt>{t('account.accountId')}</dt>
          <dd>
            <CopyableId value={user.accountId} />
          </dd>
          <dt>{t('common.created')}</dt>
          <dd>{t('account.memberSince', { date: formatDate(locale, user.createdUtc) })}</dd>
        </dl>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="first">{t('auth.firstName')}</label>
            <input
              id="first"
              className="input"
              value={firstName}
              maxLength={100}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="last">{t('auth.lastName')}</label>
            <input
              id="last"
              className="input"
              value={lastName}
              maxLength={100}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </div>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </form>
    </section>
  );
}

function PasswordSection() {
  const { t } = useTranslation();
  const toast = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const tooShort = next.length > 0 && next.length < 10;
  const mismatch = confirm.length > 0 && confirm !== next;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (next.length < 10 || next !== confirm || !current) return;
    setBusy(true);
    setError(null);
    try {
      await accountApi.changePassword(api, { currentPassword: current, newPassword: next });
      setCurrent('');
      setNext('');
      setConfirm('');
      toast.success(t('account.passwordChanged'));
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="section panel">
      <h2 className="section-title">{t('account.password')}</h2>
      {error ? <ErrorBanner error={error} /> : null}
      <form className="form-stack" onSubmit={submit}>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="current-password">{t('account.currentPassword')}</label>
            <PasswordInput
              id="current-password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="new-password">{t('auth.newPassword')}</label>
            <PasswordInput
              id="new-password"
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              aria-invalid={tooShort}
            />
            <span className={tooShort ? 'field-error' : 'field-hint'}>
              {tooShort ? t('auth.passwordTooShort') : t('auth.passwordHint')}
            </span>
          </div>
          <div className="field">
            <label htmlFor="confirm-password">{t('auth.confirmPassword')}</label>
            <PasswordInput
              id="confirm-password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              aria-invalid={mismatch}
            />
            {mismatch ? <span className="field-error">{t('auth.passwordMismatch')}</span> : null}
          </div>
        </div>
        <div className="form-actions">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={busy || !current || next.length < 10 || next !== confirm}
          >
            {t('account.changePassword')}
          </button>
        </div>
      </form>
    </section>
  );
}

function SessionsSection() {
  const { t } = useTranslation();
  const locale = useLocale();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(25);
  const [data, setData] = useState<Page<AuthSession> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [revoke, setRevoke] = useState<AuthSession | null>(null);
  const [json, setJson] = useState<AuthSession | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await accountApi.sessions(api, { pageNumber: page, pageSize: size }));
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [page, size]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns: Column<AuthSession>[] = [
    {
      id: 'device',
      header: t('account.colDevice'),
      pinned: true,
      render: (s) => (
        <div>
          <div className="cell-title row">
            {s.deviceName || t('account.unknownDevice')}
            {s.current ? <span className="pill pill-accent">{t('account.thisSession')}</span> : null}
          </div>
          <div className="cell-sub truncate" title={s.userAgent}>
            {s.userAgent}
          </div>
        </div>
      ),
    },
    {
      id: 'client',
      header: t('account.colClient'),
      render: (s) => (s.client === 'mobile' ? t('account.clientMobile') : t('account.clientWeb')),
    },
    { id: 'from', header: t('account.colFrom'), className: 'mono nowrap', render: (s) => s.sourceIp ?? '' },
    {
      id: 'lastUsed',
      header: t('account.colLastUsed'),
      className: 'nowrap',
      render: (s) =>
        s.lastUsedUtc ? (
          <span title={formatDateTime(locale, s.lastUsedUtc)}>{formatRelativeTime(locale, s.lastUsedUtc)}</span>
        ) : (
          ''
        ),
    },
    {
      id: 'created',
      header: t('common.created'),
      className: 'nowrap',
      render: (s) => formatDateTime(locale, s.createdUtc),
    },
    {
      id: 'expires',
      header: t('account.colExpires'),
      className: 'nowrap',
      defaultHidden: true,
      render: (s) => formatDateTime(locale, s.expiresUtc),
    },
  ];

  return (
    <section className="section">
      <div>
        <h2 className="section-title">{t('account.sessions')}</h2>
        <p className="small muted">{t('account.sessionsHint')}</p>
      </div>
      <DataTable
        tableId="sessions"
        columns={columns}
        rows={data?.items ?? []}
        rowKey={(s) => s.id}
        loading={loading}
        error={error}
        onRetry={load}
        onRefresh={load}
        onRowClick={(s) => setJson(s)}
        rowActions={(s) => [
          { label: t('common.viewJson'), icon: 'braces', onSelect: () => setJson(s) },
          {
            label: t('account.revokeSession'),
            icon: 'logout',
            danger: true,
            disabled: s.current,
            onSelect: () => setRevoke(s),
          },
        ]}
        empty={<EmptyState title={t('common.none')} />}
        paging={{
          pageNumber: page,
          pageSize: size,
          totalCount: data?.totalCount ?? 0,
          onPageChange: setPage,
          onPageSizeChange: (v) => {
            setSize(v);
            setPage(1);
          },
        }}
      />
      {revoke ? (
        <ConfirmModal
          title={t('account.revokeSessionTitle')}
          body={t('account.revokeSessionBody')}
          confirmLabel={t('account.revokeSession')}
          danger
          onClose={() => setRevoke(null)}
          onConfirm={async () => {
            await accountApi.revokeSession(api, revoke.id);
            toast.success(t('account.sessionRevoked'));
            await load();
          }}
        />
      ) : null}
      {json ? <JsonViewerModal title={json.deviceName || json.id} value={json} onClose={() => setJson(null)} /> : null}
    </section>
  );
}

function DeleteSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const { clear } = useAuth();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  return (
    <section className="section panel" style={{ borderColor: 'var(--color-danger)' }}>
      <h2 className="section-title">{t('common.dangerZone')}</h2>
      <p className="small">{t('account.deleteHint')}</p>
      <div>
        <button type="button" className="btn btn-danger" onClick={() => setOpen(true)}>
          {t('account.deleteAccount')}
        </button>
      </div>
      {open ? (
        <ConfirmModal
          title={t('account.deleteTitle')}
          body={t('account.deleteBody')}
          confirmLabel={t('account.deleteConfirm')}
          danger
          confirmDisabled={!password}
          onClose={() => {
            setOpen(false);
            setPassword('');
          }}
          onConfirm={async () => {
            await accountApi.deleteAccount(api, password);
            toast.success(t('account.deleted'));
            clear();
            navigate('/login', { replace: true });
          }}
        >
          <div className="field">
            <label htmlFor="delete-password">{t('auth.password')}</label>
            <PasswordInput
              id="delete-password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </ConfirmModal>
      ) : null}
    </section>
  );
}

export function AccountPage() {
  const { t } = useTranslation();
  usePageTitle(t('pageTitles.account'));
  return (
    <div className="page">
      <PageHeader title={t('account.title')} subtitle={t('account.subtitle')} />
      <ProfileSection />
      <PasswordSection />
      <SessionsSection />
      <DeleteSection />
    </div>
  );
}
