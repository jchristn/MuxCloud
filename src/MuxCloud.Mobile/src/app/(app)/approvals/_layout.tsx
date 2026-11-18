import { Stack } from 'expo-router';
import { useTheme } from '@/theme/ThemeContext';

export default function TabStack() {
  const p = useTheme();
  return <Stack screenOptions={{ headerStyle: { backgroundColor: p.panel }, headerTintColor: p.text, headerTitleStyle: { color: p.text }, contentStyle: { backgroundColor: p.bg } }} />;
}
