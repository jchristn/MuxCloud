import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';
import { highlight, type SpanKind } from '@/lib/highlight';
import { useTheme } from '@/theme/ThemeContext';
import { font, radius, spacing } from '@/theme/palette';

const LIGHT: Record<SpanKind, string | undefined> = { plain: undefined, keyword: '#8a3ab9', string: '#1f7a4d', number: '#b35900', comment: '#6b7782', type: '#2f6fb0' };
const DARK: Record<SpanKind, string | undefined> = { plain: undefined, keyword: '#c792ea', string: '#9ece6a', number: '#f2a65a', comment: '#7f8b97', type: '#7aa2f7' };

/** A fenced code block: language label, syntax colors, horizontal scroll, and a copy button. */
export function CodeBlock({ code, lang }: { code: string; lang?: string | null }) {
  const p = useTheme();
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const spans = useMemo(() => highlight(code, lang), [code, lang]);
  const colors = p.dark ? DARK : LIGHT;
  const copy = async () => {
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <View style={{ backgroundColor: p.codeBg, borderRadius: radius.sm, borderWidth: 1, borderColor: p.line, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: p.line }}>
        <Text style={{ flex: 1, color: p.muted, fontSize: font.small, fontFamily: 'Menlo' }} numberOfLines={1}>
          {(lang ?? '').split(/\s+/)[0] || 'text'}
        </Text>
        <Pressable onPress={() => void copy()} accessibilityRole="button" accessibilityLabel={t('common.copy')} hitSlop={10}>
          <Text style={{ color: copied ? p.success : p.accent, fontSize: font.small, fontWeight: '600' }}>{copied ? t('common.copied') : t('common.copy')}</Text>
        </Pressable>
      </View>
      <ScrollView horizontal contentContainerStyle={{ padding: spacing.md }}>
        <Text selectable style={{ color: p.text, fontFamily: 'Menlo', fontSize: font.mono, lineHeight: 19 }}>
          {spans.map((s, i) =>
            colors[s.kind] ? (
              <Text key={i} style={{ color: colors[s.kind], fontStyle: s.kind === 'comment' ? 'italic' : 'normal' }}>
                {s.text}
              </Text>
            ) : (
              s.text
            ),
          )}
        </Text>
      </ScrollView>
    </View>
  );
}
