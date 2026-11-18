import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { formatDuration } from '@dashboard/lib';
import type { Turn } from '@/lib/transcript';
import { useTheme } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/palette';
import { Markdown } from './Markdown';
import { T } from './ui';

/** One conversation turn: user bubble, or assistant reply with thinking, tool calls, markdown, and stats. */
export function TurnView({ turn }: { turn: Turn }) {
  const p = useTheme();
  const { t, i18n } = useTranslation();
  const [showThinking, setShowThinking] = useState(false);

  if (turn.role === 'system') {
    return (
      <T variant="small" style={{ textAlign: 'center', paddingVertical: spacing.xs }}>
        {turn.content}
      </T>
    );
  }
  if (turn.role === 'user') {
    return (
      <View style={{ alignSelf: 'flex-end', maxWidth: '88%', backgroundColor: p.accentSoft, borderRadius: radius.lg, padding: spacing.md }}>
        <T selectable>{turn.content}</T>
      </View>
    );
  }
  return (
    <View style={{ gap: spacing.sm, maxWidth: '100%' }} accessibilityLabel={turn.pending ? t('mobile.chat.replying') : undefined}>
      {turn.thinking ? (
        <Pressable onPress={() => setShowThinking((s) => !s)} accessibilityRole="button" accessibilityState={{ expanded: showThinking }}>
          <T variant="small" style={{ fontStyle: 'italic' }}>
            {showThinking ? t('mobile.chat.hideThinking') : t('mobile.chat.showThinking')}
          </T>
          {showThinking ? (
            <T variant="small" selectable style={{ marginTop: spacing.xs }}>
              {turn.thinking}
            </T>
          ) : null}
        </Pressable>
      ) : null}
      {turn.tools.length > 0 ? (
        <View style={{ gap: spacing.xs }}>
          {turn.tools.map((tool) => (
            <View key={tool.id || tool.name} style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
              <T variant="small" style={{ color: tool.status === 'fail' ? p.danger : tool.status === 'running' ? p.warning : p.success }}>
                {tool.status === 'fail' ? '✗' : tool.status === 'running' ? '…' : '✓'}
              </T>
              <T variant="mono" style={{ flex: 1 }} numberOfLines={1}>
                {tool.name}
              </T>
              {tool.elapsedMs ? <T variant="small">{formatDuration(i18n.language, tool.elapsedMs)}</T> : null}
            </View>
          ))}
        </View>
      ) : null}
      {turn.content ? (
        <View style={turn.error ? { borderLeftColor: p.danger, borderLeftWidth: 3, paddingLeft: spacing.sm } : undefined}>
          <Markdown text={turn.content} />
        </View>
      ) : turn.pending ? (
        <T variant="muted">{t('mobile.chat.thinking')}</T>
      ) : null}
      {turn.stats && !turn.pending ? (
        <T variant="small">
          {[turn.model, turn.stats.TotalMs ? formatDuration(i18n.language, turn.stats.TotalMs) : '', turn.stats.TotalTokens ? t('mobile.chat.tokens', { count: turn.stats.TotalTokens }) : '']
            .filter(Boolean)
            .join(' · ')}
        </T>
      ) : null}
    </View>
  );
}
