import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../../api';
import { api } from '../../apiClient';
import { YesNo } from '../../components/Badges';
import { ConfirmModal } from '../../components/ConfirmModal';
import { CopyableId } from '../../components/CopyButton';
import { DataTable, EmptyState, type Column } from '../../components/DataTable';
import { ErrorBanner } from '../../components/ErrorBanner';
import { JsonViewerModal } from '../../components/JsonViewerModal';
import { Modal } from '../../components/Modal';
import { PageHeader } from '../../components/PageHeader';
import { PasswordInput } from '../../components/PasswordInput';
import { Icon } from '../../components/Icon';
import { useAuth } from '../../context/AuthContext';
import { usePageTitle } from '../../context/PageTitleContext';
import { useToast } from '../../context/ToastContext';
import { useDebounced } from '../../hooks/useDebounced';
import { usePaged } from '../../hooks/usePaged';
import { useLocale } from '../../i18n/runtime';
import { formatDateTime } from '../../lib/format';
import type { User } from '../../types';

function SetPasswordModal({ user, self, onClose }: { user: User; self: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const tooShort = next.length > 0 && next.length < 10;
  const mismatch = confirm.length > 0 && confirm !== next;
  const ready = next.length >= 10 && next === confirm;
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!ready) return;
    setBusy(true);
    setError(null);
    try {
      await adminApi.setUserPassword(api, user.id, next);
      toast.success(t('admin.passwordSet'));
      onClose();
    } catch (e) {
      setError(e);
      setBusy(false);
    }
  };
  return (
    <Modal
      title={t('admin.setPasswordTitle', { email: user.email })}
      onClose={onClose}
      blocking={busy}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </button>
          <button type="submit" form="set-password-form" className="btn btn-primary" disabled={busy || !ready}>
            {busy ? t('common.saving') : t('admin.setPassword')}
          </button>
        </>
      }
    >
      <form id="set-password-form" className="form-stack" onSubmit={submit}>
        {error ? <ErrorBanner error={error} /> : null}
        <p className="small muted">
          {self ? t('admin.setPasswordSelfBody') : t('admin.setPasswordBody', { email: user.email })}
        </p>
        <div className="field">
          <label htmlFor="admin-new-password">{t('auth.newPassword')}</label>
          <PasswordInput
            id="admin-new-password"
            autoComplete="new-password"
            autoFocus
            value={next}
            onChange={(e) => setNext(e.target.value)}
            aria-invalid={tooShort}
          />
          <span className={tooShort ? 'field-error' : 'field-hint'}>
            {tooShort ? t('auth.passwordTooShort') : t('auth.passwordHint')}
          </span>
        </div>
        <div className="field">
          <label htmlFor="admin-confirm-password">{t('auth.confirmPassword')}</label>
          <PasswordInput
            id="admin-confirm-password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            aria-invalid={mismatch}
          />
          {mismatch ? <span className="field-error">{t('auth.passwordMismatch')}</span> : null}
        </div>
      </form>
    </Modal>
  );
}

function EditUserModal({
  user,
  onClose,
  onSaved,
  onSetPassword,
  onSendReset,
}: {
  user: User;
  onClose: () => void;
  onSaved: (user: User) => void;
  onSetPassword: () => void;
  onSendReset: () => void;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? '',
    active: user.active !== false,
    isAdmin: user.isAdmin,
    emailVerified: user.emailVerified,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onSaved(await adminApi.updateUser(api, user.id, form));
      onClose();
    } catch (e) {
      setError(e);
      setBusy(false);
    }
  };
  return (
    <Modal
      title={t('admin.editUser')}
      subtitle={<CopyableId value={user.id} />}
      onClose={onClose}
      blocking={busy}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </button>
          <button type="submit" form="user-form" className="btn btn-primary" disabled={busy}>
            {busy ? t('common.saving') : t('common.save')}
          </button>
        </>
      }
    >
      <form id="user-form" className="form-stack" onSubmit={submit}>
        {error ? <ErrorBanner error={error} /> : null}
        <dl className="kv">
          <dt>{t('common.email')}</dt>
          <dd>{user.email}</dd>
        </dl>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="u-first">{t('auth.firstName')}</label>
            <input
              id="u-first"
              className="input"
              value={form.firstName}
              maxLength={100}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="u-last">{t('auth.lastName')}</label>
            <input
              id="u-last"
              className="input"
              value={form.lastName}
              maxLength={100}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            />
          </div>
        </div>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked })}
          />
          <span>{t('admin.active')}</span>
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={form.emailVerified}
            onChange={(e) => setForm({ ...form, emailVerified: e.target.checked })}
          />
          <span>{t('admin.emailVerified')}</span>
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={form.isAdmin}
            onChange={(e) => setForm({ ...form, isAdmin: e.target.checked })}
          />
          <span>{t('admin.isAdmin')}</span>
        </label>
        <div className="field">
          <span className="field-label">{t('auth.password')}</span>
          <div className="row">
            <button type="button" className="btn btn-sm" onClick={onSetPassword} disabled={busy}>
              <Icon name="key" size={15} />
              {t('admin.setPassword')}
            </button>
            <button type="button" className="btn btn-sm" onClick={onSendReset} disabled={busy}>
              <Icon name="mail" size={15} />
              {t('admin.sendReset')}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

export function UsersPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const toast = useToast();
  const { user: me } = useAuth();
  usePageTitle(t('admin.usersTitle'));
  const [email, setEmail] = useState('');
  const filter = useDebounced(email.trim());
  const [edit, setEdit] = useState<User | null>(null);
  const [json, setJson] = useState<User | null>(null);
  const [remove, setRemove] = useState<User | null>(null);
  const [passwordFor, setPasswordFor] = useState<User | null>(null);
  const [resetFor, setResetFor] = useState<User | null>(null);
  const { data, setData, loading, error, reload, paging } = usePaged<User>(
    'admin-users',
    (pageNumber, pageSize) => adminApi.users(api, { pageNumber, pageSize, email: filter || undefined }),
    filter,
  );

  const columns: Column<User>[] = [
    {
      id: 'user',
      header: t('admin.colUser'),
      pinned: true,
      render: (u) => (
        <div>
          <div className="cell-title">{u.email}</div>
          <div className="cell-sub">{[u.firstName, u.lastName].filter(Boolean).join(' ')}</div>
        </div>
      ),
    },
    { id: 'active', header: t('admin.colActive'), render: (u) => <YesNo value={u.active !== false} /> },
    { id: 'verified', header: t('admin.colVerified'), render: (u) => <YesNo value={u.emailVerified} /> },
    {
      id: 'admin',
      header: t('admin.colAdmin'),
      render: (u) => (u.isAdmin ? <span className="pill pill-accent">{t('shell.admin')}</span> : ''),
    },
    {
      id: 'account',
      header: t('account.accountId'),
      defaultHidden: true,
      className: 'id-cell',
      render: (u) => <CopyableId value={u.accountId} />,
    },
    { id: 'id', header: t('common.id'), className: 'id-cell', render: (u) => <CopyableId value={u.id} /> },
    {
      id: 'created',
      header: t('admin.colCreated'),
      className: 'nowrap',
      render: (u) => formatDateTime(locale, u.createdUtc),
    },
  ];

  return (
    <div className="page">
      <PageHeader title={t('admin.usersTitle')} subtitle={t('admin.usersSubtitle')} />
      <DataTable
        tableId="admin-users"
        caption={t('admin.usersTitle')}
        columns={columns}
        rows={data?.items ?? []}
        rowKey={(u) => u.id}
        loading={loading}
        error={error}
        onRetry={reload}
        onRefresh={reload}
        paging={paging}
        onRowClick={setEdit}
        rowActions={(u) => [
          { label: t('common.edit'), icon: 'edit', onSelect: () => setEdit(u) },
          { label: t('common.viewJson'), icon: 'braces', onSelect: () => setJson(u) },
          { label: t('admin.setPassword'), icon: 'key', separatorBefore: true, onSelect: () => setPasswordFor(u) },
          { label: t('admin.sendReset'), icon: 'mail', onSelect: () => setResetFor(u) },
          {
            label: t('common.delete'),
            icon: 'trash',
            danger: true,
            separatorBefore: true,
            disabled: u.id === me?.id,
            onSelect: () => setRemove(u),
          },
        ]}
        filters={
          <div className="field">
            <label htmlFor="user-email">{t('admin.usersSearch')}</label>
            <input
              id="user-email"
              className="input"
              type="search"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="@example.com"
            />
          </div>
        }
        empty={<EmptyState title={t('table.showingNone')} />}
      />
      {edit ? (
        <EditUserModal
          user={edit}
          onClose={() => setEdit(null)}
          onSaved={(u) => {
            setData((d) => (d ? { ...d, items: d.items.map((x) => (x.id === u.id ? u : x)) } : d));
            toast.success(t('admin.userSaved'));
          }}
          onSetPassword={() => {
            setPasswordFor(edit);
            setEdit(null);
          }}
          onSendReset={() => {
            setResetFor(edit);
            setEdit(null);
          }}
        />
      ) : null}
      {passwordFor ? (
        <SetPasswordModal user={passwordFor} self={passwordFor.id === me?.id} onClose={() => setPasswordFor(null)} />
      ) : null}
      {resetFor ? (
        <ConfirmModal
          title={t('admin.sendResetTitle', { email: resetFor.email })}
          body={resetFor.active === false ? t('admin.resetDisabled') : t('admin.sendResetBody')}
          confirmLabel={t('admin.sendReset')}
          confirmDisabled={resetFor.active === false}
          onClose={() => setResetFor(null)}
          onConfirm={async () => {
            await adminApi.sendPasswordReset(api, resetFor.id);
            toast.success(t('admin.resetSent', { email: resetFor.email }));
          }}
        />
      ) : null}
      {json ? <JsonViewerModal title={json.email} value={json} onClose={() => setJson(null)} /> : null}
      {remove ? (
        <ConfirmModal
          title={t('admin.deleteUserTitle', { email: remove.email })}
          body={t('admin.deleteUserBody')}
          confirmLabel={t('common.delete')}
          danger
          onClose={() => setRemove(null)}
          onConfirm={async () => {
            await adminApi.deleteUser(api, remove.id);
            toast.success(t('admin.userDeleted'));
            await reload();
          }}
        />
      ) : null}
    </div>
  );
}
