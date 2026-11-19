import { useEffect, useState } from 'react';
import { Linking, View } from 'react-native';
import Constants from 'expo-constants';
import * as LocalAuthentication from 'expo-local-authentication';
import { router, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LOCALES } from '@dashboard/i18n/catalog';
import { Button, KeyValues, ListRow, Notice, Screen, Section, Segmented, ToggleRow } from '@/components/ui';
import { applyDirection, deviceLocale } from '@/i18n/runtime';
import { onPushStatus, pushStatus, type PushStatus } from '@/push/PushRegistrar';
import { isInsecureServer } from '@/storage/prefs';
import { usePrefs } from '@/state/PrefsContext';
import { spacing } from '@/theme/palette';

/** Where the desktop's Help menu points: the documentation and a new GitHub issue. */
const DOCS_URL = 'https://github.com/jchristn/Mux#readme';
const ISSUE_URL = 'https://github.com/jchristn/Mux/issues/new';

/** App settings: server, language, theme, chat, biometric lock, notifications, help, and version. */
export default function AppSettings() {
  const { t } = useTranslation();
  const { prefs, update } = usePrefs();
  const [push, setPush] = useState<PushStatus>(pushStatus());
  const [canBiometric, setCanBiometric] = useState(false);
  const [restart, setRestart] = useState(false);

  useEffect(() => onPushStatus(setPush), []);
  useEffect(() => {
    void LocalAuthentication.hasHardwareAsync().then(async (has) => setCanBiometric(has && (await LocalAuthentication.isEnrolledAsync())));
  }, []);

  const chooseLocale = (code: string | null) => {
    update({ locale: code });
    setRestart(applyDirection(code ?? deviceLocale()));
  };

  const release = (Constants.expoConfig?.extra as { releaseVersion?: string } | undefined)?.releaseVersion ?? Constants.expoConfig?.version ?? '';

  return (
    <Screen>
      <Stack.Screen options={{ title: t('mobile.account.appSettings') }} />
      <Section title={t('mobile.settings.server')}>
        <ListRow title={prefs.serverUrl} subtitle={t('mobile.settings.serverHint')} onPress={() => router.push('/server')} />
        {isInsecureServer(prefs.serverUrl) ? <Notice tone="warning" text={t('mobile.auth.insecure')} /> : null}
      </Section>
      <Section title={t('mobile.settings.theme')}>
        <Segmented
          value={prefs.theme}
          onChange={(theme) => update({ theme })}
          options={[
            { value: 'system', label: t('mobile.settings.themeSystem') },
            { value: 'light', label: t('mobile.settings.themeLight') },
            { value: 'dark', label: t('mobile.settings.themeDark') },
          ]}
        />
      </Section>
      <Section title={t('mobile.settings.language')}>
        {/* Shown above the list: the choice was just made at the top of it, and the list is long. */}
        {restart ? <Notice tone="warning" text={t('mobile.settings.restartForDirection')} /> : null}
        <View style={{ marginHorizontal: -spacing.lg }}>
          <ListRow title={t('mobile.settings.languageDevice')} selected={prefs.locale === null} onPress={() => chooseLocale(null)} />
          {LOCALES.filter((l) => !l.pseudo || __DEV__).map((l) => (
            <ListRow
              key={l.code}
              title={l.nativeName}
              subtitle={l.englishName !== l.nativeName ? l.englishName : undefined}
              selected={prefs.locale === l.code}
              onPress={() => chooseLocale(l.code)}
            />
          ))}
        </View>
      </Section>
      <Section title={t('mobile.settings.chat')}>
        <ToggleRow
          label={t('mobile.settings.expandThinking')}
          hint={t('mobile.settings.expandThinkingHint')}
          value={prefs.expandThinking}
          onChange={(expandThinking) => update({ expandThinking })}
        />
      </Section>
      <Section title={t('mobile.settings.security')}>
        <ToggleRow
          label={t('mobile.settings.biometric')}
          hint={canBiometric ? t('mobile.settings.biometricHint') : t('mobile.settings.biometricUnavailable')}
          value={prefs.biometricLock}
          disabled={!canBiometric}
          onChange={(biometricLock) => update({ biometricLock })}
        />
      </Section>
      <Section title={t('mobile.settings.notifications')}>
        <Notice
          tone={push === 'registered' ? 'success' : push === 'denied' || push === 'failed' ? 'warning' : 'info'}
          text={t('mobile.settings.push.' + push)}
        />
      </Section>
      <Section title={t('mobile.settings.help')}>
        <View style={{ marginHorizontal: -spacing.lg }}>
          <ListRow title={t('mobile.settings.docs')} subtitle={t('mobile.settings.docsHint')} onPress={() => void Linking.openURL(DOCS_URL)} />
          <ListRow title={t('mobile.settings.reportIssue')} subtitle={t('mobile.settings.reportIssueHint')} onPress={() => void Linking.openURL(ISSUE_URL)} />
        </View>
      </Section>
      <Section title={t('mobile.settings.about')}>
        <KeyValues
          rows={[
            [t('mobile.settings.version'), release],
            [t('mobile.settings.operator'), 'Lattice AI, LLC'],
            [t('mobile.settings.contact'), 'hello@latticetech.ai'],
          ]}
        />
        <Button title={t('mobile.auth.readTerms')} kind="ghost" onPress={() => router.push('/account/legal?doc=terms')} />
        <Button title={t('mobile.auth.readPrivacy')} kind="ghost" onPress={() => router.push('/account/legal?doc=privacy')} />
      </Section>
    </Screen>
  );
}
