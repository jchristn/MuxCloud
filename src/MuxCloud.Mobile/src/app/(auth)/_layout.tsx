import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/state/AuthContext';
import { useTheme } from '@/theme/ThemeContext';

export default function AuthLayout() {
  const { state } = useAuth();
  const p = useTheme();
  if (state.status === 'signedIn') return <Redirect href="/machines" />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: p.bg } }} />;
}
