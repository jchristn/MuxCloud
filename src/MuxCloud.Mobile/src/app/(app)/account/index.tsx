import { useState } from 'react';
import { RefreshControl, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { accountApi } from '@dashboard/api';
import { formatRelativeTime } from '@dashboard/lib';
import { RemoteNotice } from '@/components/RemoteNotice';
import { Badge, Button, Card, ErrorBox, Field, ListRow, Notice, Screen, Section, T } from '@/components/ui';
import { unregisterPush } from '@/push/PushRegistrar';
import { useAccount } from '@/state/AccountContext';
import { useAuth } from '@/state/AuthContext';
import { usePrefs } from '@/state/PrefsContext';
import { useAsync } from '@/state/useAsync';
import { spacing } from '@/theme/palette';

/** Profile, password, signed-in sessions, plan, sign out, and account deletion. */
export default function Account() {
  const { t, i18n } = useTranslation();
  const { auth, state } = useAuth();
  const { entitlements } = useAccount();
  const { prefs } = usePrefs();
  const user = state.user;
  const sessions = useAsync(() => accountApi.sessions(auth.client, { pageSize: 100 }).then((r) => r.items), [auth]);
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [done, setDone] = useState<string | null>(null);

  // Reset the fields when the signed-in user object changes (adjusted during render, not in an effect).
  const [seenUser, setSeenUser] = useState(user);
  if (user !== seenUser) {
    setSeenUser(user);
    setFirstName(user?.firstName ?? '');
    setLastName(user?.lastName ?? '');
  }

  const run = async (name: string, action: () => Promise<void>, message: string) => {
    setBusy(name);
    setError(null);
    setDone(null);
    try {
      await action();
      setDone(message);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(null);
    }
  };

  const signOut = async () => {
    await unregisterPush(auth.client, prefs.pushDeviceId);
    await auth.signOut();
    router.replace('/sign-in');
  };

  return (
    <Screen refreshControl={<RefreshControl refreshing={sessions.loading && !!sessions.data} onRefresh={() => void sessions.reload()} />}>
      <Stack.Screen options={{ title: t('mobile.account.title') }} />
      <Card>
        <T variant="title">{[user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email}</T>
        <T variant="muted">{user?.email}</T>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {user?.emailVerified ? <Badge tone="success" label={t('mobile.account.verified')} /> : <Badge tone="warning" label={t('mobile.account.unverified')} />}
          {entitlements ? <Badge tone="info" label={t('mobile.account.plan', { plan: entitlements.planCode })} /> : null}
        </View>
      </Card>
      {error ? <ErrorBox error={error} /> : null}
      {done ? <Notice tone="success" text={done} /> : null}
      <Section title={t('mobile.account.profile')}>
        <Field label={t('auth.firstName')} value={firstName} onChangeText={setFirstName} />
        <Field label={t('auth.lastName')} value={lastName} onChangeText={setLastName} />
        <Button
          title={t('common.save')}
          kind="secondary"
          busy={busy === 'profile'}
          onPress={() =>
            void run(
              'profile',
              async () => {
                const updated = await accountApi.update(auth.client, { firstName: firstName.trim(), lastName: lastName.trim() });
                auth.setUser(updated);
              },
              t('mobile.manage.saved'),
            )
          }
        />
      </Section>
      <Section title={t('mobile.account.password')}>
        <Field label={t('mobile.account.currentPassword')} value={current} onChangeText={setCurrent} secureTextEntry autoComplete="current-password" />
        <Field label={t('auth.newPassword')} hint={t('auth.passwordHint')} value={next} onChangeText={setNext} secureTextEntry autoComplete="new-password" />
        <Button
          title={t('mobile.account.changePassword')}
          kind="secondary"
          busy={busy === 'password'}
          disabled={!current || next.length < 10}
          onPress={() =>
            void run(
              'password',
              async () => {
                await accountApi.changePassword(auth.client, { currentPassword: current, newPassword: next });
                setCurrent('');
                setNext('');
              },
              t('mobile.account.passwordChanged'),
            )
          }
        />
      </Section>
      <Section title={t('mobile.account.sessions')}>
        <View style={{ marginHorizontal: -spacing.lg }}>
          {(sessions.data ?? []).map((s) => (
            <ListRow
              key={s.id}
              title={s.deviceName || s.userAgent || s.client}
              subtitle={[s.sourceIp, s.lastUsedUtc ? formatRelativeTime(i18n.language, s.lastUsedUtc) : ''].filter(Boolean).join(' · ')}
              trailing={
                s.current ? (
                  <Badge tone="success" label={t('mobile.account.thisDevice')} />
                ) : (
                  <Button compact kind="secondary" title={t('mobile.account.revoke')} onPress={() => void run('revoke', async () => { await accountApi.revokeSession(auth.client, s.id); await sessions.reload(); }, t('mobile.account.revoked'))} />
                )
              }
            />
          ))}
        </View>
      </Section>
      <RemoteNotice />
      <Button title={t('machines.addMachine')} kind="secondary" onPress={() => router.push('/account/add-machine')} />
      <Button title={t('mobile.account.appSettings')} kind="secondary" onPress={() => router.push('/account/settings')} />
      <Button title={t('mobile.account.signOut')} kind="secondary" onPress={() => void signOut()} />
      <Section title={t('common.dangerZone')}>
        <Button title={t('mobile.account.deleteAccount')} kind="danger" busy={busy === 'delete'} onPress={() => router.push('/account/delete')} />
      </Section>
    </Screen>
  );
}
