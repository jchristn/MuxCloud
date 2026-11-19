import React from 'react';
import { Image, useWindowDimensions, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { isInsecureServer } from '@/storage/prefs';
import { usePrefs } from '@/state/PrefsContext';
import { useTheme } from '@/theme/ThemeContext';
import { spacing } from '@/theme/palette';
import { Button, Notice, T } from './ui';

/** The brand wordmark, cropped tight (464 x 128), green in light and dark like the web sign-in. */
const WORDMARK = require('../../assets/images/logo-green-wordmark.png');
const WORDMARK_RATIO = 464 / 128;

/** Width at which the auth screens switch to the roomier, vertically centered tablet layout. */
const TABLET_WIDTH = 700;

/** Space kept between the focused input and the keyboard: a section gap plus a full-height button. */
const AUTH_KEYBOARD_OFFSET = spacing.lg + 56 + spacing.lg;

/**
 * Logo, tagline, title, and server line shared by the sign-in, sign-up, verify, password, and server screens. The
 * header gets generous space on phones and more on tablets, where the form is centered vertically. The whole screen
 * scrolls with the keyboard up, so the primary button stays reachable on small phones.
 */
export function AuthFrame({ title, subtitle, children, showServer = true }: { title: string; subtitle?: string; children: React.ReactNode; showServer?: boolean }) {
  const p = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { prefs } = usePrefs();
  const { width, height } = useWindowDimensions();
  const tablet = width >= TABLET_WIDTH;
  // Small phones (iPhone SE class) keep a little less space above the logo so the form fits without scrolling.
  const compact = height < 700;
  const logoHeight = tablet ? 36 : 32;
  return (
    <KeyboardAwareScrollView
      style={{ flex: 1, backgroundColor: p.bg }}
      // Keep the field after the focused one (usually the primary button) above the keyboard too, not just the input.
      bottomOffset={AUTH_KEYBOARD_OFFSET}
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: tablet ? 'center' : 'flex-start',
        padding: spacing.xl,
        paddingTop: insets.top + (tablet ? spacing.xxl * 2 : compact ? spacing.xl : spacing.xxl + spacing.lg),
        paddingBottom: insets.bottom + (tablet ? spacing.xxl * 2 : spacing.xl),
        gap: spacing.lg,
        maxWidth: 520,
        width: '100%',
        alignSelf: 'center',
      }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ alignItems: 'center', gap: spacing.md, paddingVertical: tablet ? spacing.xl : spacing.lg, marginBottom: tablet ? spacing.xl : spacing.lg }}>
        <Image
          source={WORDMARK}
          style={{ height: logoHeight, width: logoHeight * WORDMARK_RATIO }}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
          accessibilityLabel="Mux"
        />
        <T variant="muted" style={{ textAlign: 'center' }}>
          {t('auth.tagline')}
        </T>
      </View>
      <View style={{ gap: spacing.xs }}>
        <T variant="heading">{title}</T>
        {subtitle ? <T variant="muted">{subtitle}</T> : null}
      </View>
      {children}
      {showServer ? (
        <View style={{ gap: spacing.xs, alignItems: 'center' }}>
          <T variant="small">{t('mobile.auth.server', { url: prefs.serverUrl })}</T>
          <Button title={t('mobile.auth.changeServer')} kind="ghost" compact onPress={() => router.push('/server')} />
        </View>
      ) : null}
      {showServer && isInsecureServer(prefs.serverUrl) ? <Notice tone="warning" text={t('mobile.auth.insecure')} /> : null}
    </KeyboardAwareScrollView>
  );
}
