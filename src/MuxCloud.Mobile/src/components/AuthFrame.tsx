import React from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { isInsecureServer } from '@/storage/prefs';
import { usePrefs } from '@/state/PrefsContext';
import { useTheme } from '@/theme/ThemeContext';
import { spacing } from '@/theme/palette';
import { Button, Notice, T } from './ui';

const LOGO_LIGHT = require('../../assets/images/logo-black.png');
const LOGO_DARK = require('../../assets/images/logo-white.png');

/** Logo, title, and server line shared by the sign-in, sign-up, and password screens. */
export function AuthFrame({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const p = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { prefs } = usePrefs();
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: p.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingTop: insets.top + spacing.xl, gap: spacing.lg, maxWidth: 520, width: '100%', alignSelf: 'center' }} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'center', gap: spacing.sm }}>
          <Image source={p.dark ? LOGO_DARK : LOGO_LIGHT} style={{ width: 96, height: 96 }} accessibilityIgnoresInvertColors accessibilityLabel="Mux" />
          <T variant="muted">{t('auth.tagline')}</T>
        </View>
        <View style={{ gap: spacing.xs }}>
          <T variant="heading">{title}</T>
          {subtitle ? <T variant="muted">{subtitle}</T> : null}
        </View>
        {children}
        <View style={{ gap: spacing.xs, alignItems: 'center' }}>
          <T variant="small">{t('mobile.auth.server', { url: prefs.serverUrl })}</T>
          <Button title={t('mobile.auth.changeServer')} kind="ghost" compact onPress={() => router.push('/server')} />
        </View>
        {isInsecureServer(prefs.serverUrl) ? <Notice tone="warning" text={t('mobile.auth.insecure')} /> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
