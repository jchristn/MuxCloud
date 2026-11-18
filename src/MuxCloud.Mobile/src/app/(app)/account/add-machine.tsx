import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { RemoteNotice } from '@/components/RemoteNotice';
import { Card, Screen, T } from '@/components/ui';
import { usePrefs } from '@/state/PrefsContext';

/** How to connect a computer: sign in to Mux Cloud from any mux surface on that machine. */
export default function AddMachine() {
  const { t } = useTranslation();
  const { prefs } = usePrefs();
  const steps: [string, string, string?][] = [
    [t('addMachine.cliTitle'), t('addMachine.cliBody'), 'mux cloud login'],
    [t('addMachine.tuiTitle'), t('addMachine.tuiBody')],
    [t('addMachine.desktopTitle'), t('addMachine.desktopBody')],
    [t('addMachine.dashboardTitle'), t('addMachine.dashboardBody')],
    [t('addMachine.vscodeTitle'), t('addMachine.vscodeBody')],
    [t('addMachine.trayTitle'), t('addMachine.trayBody')],
    [t('addMachine.serverTitle'), t('addMachine.serverBody', { url: prefs.serverUrl })],
  ];
  return (
    <Screen>
      <Stack.Screen options={{ title: t('addMachine.title') }} />
      <T variant="muted">{t('addMachine.intro')}</T>
      {steps.map(([title, body, code]) => (
        <Card key={title}>
          <T variant="title">{title}</T>
          <T variant="muted">{body}</T>
          {code ? (
            <T variant="mono" selectable>
              {code}
            </T>
          ) : null}
        </Card>
      ))}
      <RemoteNotice />
    </Screen>
  );
}
