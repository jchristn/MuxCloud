import React, { useRef } from 'react';
import {
  ActivityIndicator,
  I18nManager,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputInstance,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { errorText } from '@dashboard/lib';
import { useTheme } from '@/theme/ThemeContext';
import { font, radius, spacing } from '@/theme/palette';

type TextVariant = 'body' | 'muted' | 'small' | 'title' | 'heading' | 'mono' | 'label';

/** Themed text. */
export function T({
  children,
  variant = 'body',
  style,
  numberOfLines,
  selectable,
  accessibilityRole,
  accessibilityLabel,
}: {
  children: React.ReactNode;
  accessibilityLabel?: string;
  variant?: TextVariant;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  selectable?: boolean;
  accessibilityRole?: 'header' | 'text' | 'link';
}) {
  const p = useTheme();
  const base: TextStyle = { color: p.text, fontSize: font.body };
  const variants: Record<TextVariant, TextStyle> = {
    body: {},
    muted: { color: p.muted },
    small: { color: p.muted, fontSize: font.small },
    title: { fontSize: font.title, fontWeight: '600' },
    heading: { fontSize: font.heading, fontWeight: '700' },
    mono: { fontFamily: 'Menlo', fontSize: font.mono },
    label: { color: p.muted, fontSize: font.small, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  };
  return (
    <Text
      style={[base, variants[variant], style]}
      numberOfLines={numberOfLines}
      selectable={selectable}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole ?? (variant === 'heading' || variant === 'title' ? 'header' : 'text')}
    >
      {children}
    </Text>
  );
}

/** Widest a single column of content gets on tablets and large windows: lines stay readable, controls stay grouped. */
export const CONTENT_MAX_WIDTH = 840;

/**
 * Scrollable screen body with standard padding, centered in a readable column on wide screens. `wide` drops the
 * column cap so dashboards (usage charts) use the whole width on tablets.
 */
export function Screen({
  children,
  scroll = true,
  wide = false,
  refreshControl,
  contentStyle,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  wide?: boolean;
  refreshControl?: React.ReactElement;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const p = useTheme();
  if (!scroll) return <View style={[{ flex: 1, backgroundColor: p.bg }, contentStyle]}>{children}</View>;
  // Keyboard-aware: the focused field scrolls above the keyboard on iOS and on edge-to-edge Android.
  return (
    <KeyboardAwareScrollView
      style={{ flex: 1, backgroundColor: p.bg }}
      contentContainerStyle={[
        { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl, width: '100%', maxWidth: wide ? undefined : CONTENT_MAX_WIDTH, alignSelf: 'center' },
        contentStyle,
      ]}
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl}
      bottomOffset={spacing.xl}
    >
      {children}
    </KeyboardAwareScrollView>
  );
}

/** A grouped surface. */
export function Card({ children, style, onPress, accessibilityLabel }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; accessibilityLabel?: string }) {
  const p = useTheme();
  const cardStyle: StyleProp<ViewStyle> = [
    { backgroundColor: p.panel, borderColor: p.line, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
    style,
  ];
  if (!onPress) return <View style={cardStyle}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [cardStyle, pressed ? { opacity: 0.7 } : null]}
    >
      {children}
    </Pressable>
  );
}

type ButtonKind = 'primary' | 'secondary' | 'danger' | 'ghost';

/** Themed button with a busy state. Minimum 44 point touch target. */
export function Button({
  title,
  onPress,
  kind = 'primary',
  busy,
  disabled,
  style,
  accessibilityHint,
  compact,
  testID,
}: {
  title: string;
  testID?: string;
  onPress: () => void;
  kind?: ButtonKind;
  busy?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
  compact?: boolean;
}) {
  const p = useTheme();
  const colors: Record<ButtonKind, { bg: string; fg: string; border: string }> = {
    primary: { bg: p.accent, fg: p.onAccent, border: p.accent },
    secondary: { bg: p.panelAlt, fg: p.text, border: p.line },
    danger: { bg: p.danger, fg: '#ffffff', border: p.danger },
    ghost: { bg: 'transparent', fg: p.accent, border: 'transparent' },
  };
  const c = colors[kind];
  const off = disabled || busy;
  return (
    <Pressable
      testID={testID}
      onPress={off ? undefined : onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!busy }}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [
        {
          minHeight: compact ? 36 : 44,
          paddingHorizontal: compact ? spacing.md : spacing.lg,
          borderRadius: radius.md,
          backgroundColor: c.bg,
          borderColor: c.border,
          borderWidth: 1,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: spacing.sm,
          opacity: off ? 0.55 : pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      {busy ? <ActivityIndicator color={c.fg} size="small" /> : null}
      <Text style={{ color: c.fg, fontSize: font.body, fontWeight: '600' }}>{title}</Text>
    </Pressable>
  );
}

/** Labeled text input. */
export function Field({
  label,
  hint,
  error,
  style,
  multiline,
  grow,
  ...input
}: TextInputProps & { label: string; hint?: string; error?: string | null; /** Starts one line tall and grows with long values (paths). */ grow?: boolean }) {
  const p = useTheme();
  const ref = useRef<TextInputInstance>(null);
  return (
    <View style={{ gap: spacing.xs }}>
      <Pressable onPress={() => ref.current?.focus()} accessible={false} hitSlop={{ top: 6, bottom: 6 }}>
        <T variant="small" style={{ fontWeight: '600', color: p.text }}>
          {label}
        </T>
      </Pressable>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        placeholderTextColor={p.muted}
        multiline={multiline || grow}
        scrollEnabled={grow ? false : undefined}
        style={[
          {
            minHeight: multiline ? 96 : 44,
            paddingTop: grow ? 12 : undefined,
            paddingBottom: grow ? 12 : undefined,
            borderWidth: 1,
            borderColor: error ? p.danger : p.line,
            borderRadius: radius.md,
            paddingHorizontal: spacing.md,
            paddingVertical: multiline ? spacing.sm : 0,
            color: p.text,
            backgroundColor: p.panel,
            fontSize: font.body,
            textAlignVertical: multiline ? 'top' : 'center',
            // TextInput does not follow the layout direction on its own: align typed text with the RTL layout.
            textAlign: I18nManager.isRTL ? 'right' : 'left',
          },
          style,
        ]}
        {...input}
      />
      {error ? <T variant="small" style={{ color: p.danger }}>{error}</T> : hint ? <T variant="small">{hint}</T> : null}
    </View>
  );
}

/** A row with a label and a switch. */
export function ToggleRow({ label, hint, value, onChange, disabled }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  const p = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 44 }}>
      <View style={{ flex: 1 }}>
        <T>{label}</T>
        {hint ? <T variant="small">{hint}</T> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        accessibilityLabel={label}
        trackColor={{ true: p.accent, false: p.line }}
      />
    </View>
  );
}

/**
 * Choose one option. `scroll` keeps long option lists (skill categories, labels) on one horizontally scrolling row
 * instead of wrapping into many rows that push the content down.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  scroll,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label?: string;
  scroll?: boolean;
}) {
  const p = useTheme();
  const chips = options.map((o) => {
    const active = o.value === value;
    return (
      <Pressable
        key={o.value}
        onPress={() => onChange(o.value)}
        accessibilityRole="radio"
        accessibilityState={{ selected: active }}
        hitSlop={{ top: 4, bottom: 4 }}
        style={{
          minHeight: 40,
          paddingHorizontal: spacing.md,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: active ? p.accent : p.line,
          backgroundColor: active ? p.accentSoft : p.panel,
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: active ? p.accent : p.text, fontWeight: active ? '600' : '400' }}>{o.label}</Text>
      </Pressable>
    );
  });
  if (scroll) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityRole="radiogroup"
        accessibilityLabel={label}
        style={{ marginHorizontal: -spacing.lg, flexGrow: 0 }}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.xs }}
      >
        {chips}
      </ScrollView>
    );
  }
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
      {chips}
    </View>
  );
}

/** Small colored status pill. */
export function Badge({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'success' | 'danger' | 'warning' | 'info' }) {
  const p = useTheme();
  const tones = {
    neutral: { bg: p.panelAlt, fg: p.muted },
    success: { bg: p.successSoft, fg: p.success },
    danger: { bg: p.dangerSoft, fg: p.danger },
    warning: { bg: p.warningSoft, fg: p.warning },
    info: { bg: p.panelAlt, fg: p.info },
  };
  const c = tones[tone];
  return (
    <View style={{ backgroundColor: c.bg, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2, alignSelf: 'flex-start' }}>
      <Text style={{ color: c.fg, fontSize: font.small, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

/** Pressable list row with a title, subtitle, and trailing content. */
export function ListRow({
  title,
  subtitle,
  trailing,
  onPress,
  onLongPress,
  leading,
  selected,
  accessibilityLabel,
}: {
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  leading?: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  selected?: boolean;
  accessibilityLabel?: string;
}) {
  const p = useTheme();
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ selected: !!selected }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        minHeight: 56,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        backgroundColor: selected ? p.accentSoft : pressed ? p.panelAlt : p.panel,
        borderBottomColor: p.line,
        borderBottomWidth: StyleSheet.hairlineWidth,
      })}
    >
      {leading}
      <View style={{ flex: 1, gap: 2 }}>
        <T numberOfLines={1} style={{ fontWeight: '600' }}>
          {title}
        </T>
        {subtitle ? (
          <T variant="small" numberOfLines={2}>
            {subtitle}
          </T>
        ) : null}
      </View>
      {trailing}
    </Pressable>
  );
}

/** Section heading inside a screen. */
export function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <T variant="label">{title}</T>
        {action}
      </View>
      {children}
    </View>
  );
}

/** Centered loading spinner. */
export function Loading({ label }: { label?: string }) {
  const p = useTheme();
  const { t } = useTranslation();
  return (
    <View style={{ padding: spacing.xl, alignItems: 'center', gap: spacing.sm }} accessibilityLabel={label ?? t('common.loading')}>
      <ActivityIndicator color={p.accent} />
      <T variant="muted">{label ?? t('common.loading')}</T>
    </View>
  );
}

/** Empty state with an optional action. */
export function Empty({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <View style={{ padding: spacing.xl, alignItems: 'center', gap: spacing.sm }}>
      <T variant="title" style={{ textAlign: 'center' }}>
        {title}
      </T>
      {body ? (
        <T variant="muted" style={{ textAlign: 'center' }}>
          {body}
        </T>
      ) : null}
      {action}
    </View>
  );
}

/** A localized error with an optional retry. */
export function ErrorBox({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const p = useTheme();
  const { t } = useTranslation();
  const text = errorText(error);
  return (
    <View
      accessibilityRole="alert"
      style={{ backgroundColor: p.dangerSoft, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm }}
    >
      <T style={{ color: p.danger, fontWeight: '600' }}>{t(text.key, text.values)}</T>
      {text.detail && text.detail !== t(text.key, text.values) ? <T variant="small">{text.detail}</T> : null}
      {onRetry ? <Button title={t('common.retry')} kind="secondary" compact onPress={onRetry} style={{ alignSelf: 'flex-start' }} /> : null}
    </View>
  );
}

/** Informational banner. */
export function Notice({ text, tone = 'info' }: { text: string; tone?: 'info' | 'warning' | 'success' | 'danger' }) {
  const p = useTheme();
  const colors = {
    info: { bg: p.panelAlt, fg: p.text },
    warning: { bg: p.warningSoft, fg: p.warning },
    success: { bg: p.successSoft, fg: p.success },
    danger: { bg: p.dangerSoft, fg: p.danger },
  }[tone];
  return (
    <View style={{ backgroundColor: colors.bg, borderRadius: radius.md, padding: spacing.md }}>
      <T style={{ color: colors.fg }}>{text}</T>
    </View>
  );
}

/** Key and value pairs. */
export function KeyValues({ rows }: { rows: [string, React.ReactNode][] }) {
  const p = useTheme();
  return (
    <View>
      {rows.map(([k, v]) => (
        <View
          key={k}
          style={{ flexDirection: 'row', paddingVertical: spacing.sm, borderBottomColor: p.line, borderBottomWidth: StyleSheet.hairlineWidth, gap: spacing.md }}
        >
          <T variant="muted" style={{ width: 130 }}>
            {k}
          </T>
          <View style={{ flex: 1 }}>{typeof v === 'string' || typeof v === 'number' ? <T selectable>{String(v)}</T> : v}</View>
        </View>
      ))}
    </View>
  );
}

/** Online, offline, approval, or revoked dot. */
export function StatusDot({ status }: { status: 'online' | 'offline' | 'approval' | 'revoked' }) {
  const p = useTheme();
  const color = { online: p.success, offline: p.muted, approval: p.warning, revoked: p.danger }[status];
  return <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />;
}
