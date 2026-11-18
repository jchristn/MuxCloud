import { Redirect, Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { machineTotals } from '@dashboard/lib';
import { useAccount } from '@/state/AccountContext';
import { useAuth } from '@/state/AuthContext';
import { useTheme } from '@/theme/ThemeContext';

export default function AppLayout() {
  const { state } = useAuth();
  const { machines } = useAccount();
  const p = useTheme();
  const { t } = useTranslation();
  if (state.status === 'signedOut') return <Redirect href="/sign-in" />;
  const waiting = machineTotals(machines).awaitingApproval;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: p.accent,
        tabBarInactiveTintColor: p.muted,
        tabBarStyle: { backgroundColor: p.panel, borderTopColor: p.line },
      }}
    >
      <Tabs.Screen name="machines" options={{ title: t('machines.title'), tabBarIcon: ({ color, size }) => <Ionicons name="desktop-outline" color={color as string} size={size} /> }} />
      <Tabs.Screen name="conversations" options={{ title: t('conversations.title'), tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles-outline" color={color as string} size={size} /> }} />
      <Tabs.Screen
        name="approvals"
        options={{
          title: t('mobile.approvals.tab'),
          tabBarBadge: waiting > 0 ? waiting : undefined,
          tabBarIcon: ({ color, size }) => <Ionicons name="shield-checkmark-outline" color={color as string} size={size} />,
        }}
      />
      <Tabs.Screen name="account" options={{ title: t('mobile.account.tab'), tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" color={color as string} size={size} /> }} />
    </Tabs>
  );
}
