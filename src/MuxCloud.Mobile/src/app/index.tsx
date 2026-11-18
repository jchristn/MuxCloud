import { Redirect } from 'expo-router';
import { Loading, Screen } from '@/components/ui';
import { useAuth } from '@/state/AuthContext';

/** Entry: restore the session, then go to the machines list or sign-in. */
export default function Index() {
  const { state } = useAuth();
  if (state.status === 'loading') {
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  }
  return <Redirect href={state.status === 'signedIn' ? '/machines' : '/sign-in'} />;
}
