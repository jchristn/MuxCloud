import { useEffect } from 'react';
import { Linking } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Loading, Screen } from '@/components/ui';
import { usePrefs } from '@/state/PrefsContext';

/** Legal documents live on the web dashboard (/legal/terms, /legal/privacy, /legal/account-deletion); open them in the browser. */
export default function Legal() {
  const { doc } = useLocalSearchParams<{ doc?: string }>();
  const { prefs } = usePrefs();
  useEffect(() => {
    const page = doc === 'privacy' ? 'privacy' : doc === 'account-deletion' ? 'account-deletion' : 'terms';
    void Linking.openURL(prefs.serverUrl + '/legal/' + page).finally(() => router.back());
  }, [doc, prefs.serverUrl]);
  return (
    <Screen>
      <Loading />
    </Screen>
  );
}
