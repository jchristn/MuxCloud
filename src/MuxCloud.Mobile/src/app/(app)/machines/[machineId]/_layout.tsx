import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeContext';

export default function MachineLayout() {
  const p = useTheme();
  const { t } = useTranslation();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: p.panel },
        headerTintColor: p.text,
        headerTitleStyle: { color: p.text },
        contentStyle: { backgroundColor: p.bg },
        headerBackTitle: t('mobile.common.back'),
      }}
    />
  );
}
