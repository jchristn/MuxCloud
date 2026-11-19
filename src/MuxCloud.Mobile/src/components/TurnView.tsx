import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';
import { CHAT_COMMANDS } from '@/lib/chatCommands';
import { prettyJson } from '@/lib/chatStats';
import { formatDuration } from '@/lib/duration';
import type { ToolLine, Turn } from '@/lib/transcript';
import { useTheme } from '@/theme/ThemeContext';
import { font, radius, spacing } from '@/theme/palette';
import { Markdown } from './Markdown';
import { T } from './ui';

const RESULT_PREVIEW = 1500;

/**
 * One conversation turn: user bubble, or assistant reply with thinking, expandable tool cards, markdown, stats, and
 * Copy / Details actions. The local help card renders tappable commands.
 */
export function TurnView({
  turn,
  expandThinking = false,
  onInfo,
  onCommand,
}: {
  turn: Turn;
  /** Open the thinking section by default (app setting). */
  expandThinking?: boolean;
  /** Show the turn details sheet. */
  onInfo?: (turn: Turn) => void;
  /** A command tapped on the help card. */
  onCommand?: (command: string) => void;
}) {
  const p = useTheme();
  const { t, i18n } = useTranslation();
  const [showThinking, setShowThinking] = useState(expandThinking);
  const [copied, setCopied] = useState(false);

  if (turn.card === 'help') return <HelpCard onCommand={onCommand} />;
  if (turn.role === 'system') {
    return (
      <T variant="small" style={{ textAlign: 'center', paddingVertical: spacing.xs }}>
        {turn.content}
      </T>
    );
  }
  if (turn.role === 'user') {
    const a = turn.attachments;
    return (
      <View style={{ alignSelf: 'flex-end', maxWidth: '88%', gap: spacing.xs, alignItems: 'flex-end' }}>
        <View style={{ backgroundColor: p.accentSoft, borderRadius: radius.lg, padding: spacing.md }}>
          <T selectable>{turn.content}</T>
        </View>
        {a && (a.Attached.length > 0 || a.Skipped.length > 0 || a.Notes.length > 0) ? (
          <View style={{ gap: 2, alignItems: 'flex-end' }} accessibilityLabel={t('mobile.attach.label')}>
            {a.Attached.length > 0 ? (
              <T variant="small" style={{ textAlign: 'right' }}>
                {t('mobile.attach.attached', {
                  list: a.Attached.map((x) => x.Path + (x.Kind === 'directory' ? '/' : '') + (x.Lines ? ' (' + t('mobile.attach.lines', { count: x.Lines }) + ')' : '')).join(', '),
                })}
              </T>
            ) : null}
            {a.Skipped.map((x) => (
              <T key={x.Path} variant="small" style={{ color: p.warning, textAlign: 'right' }}>
                {t('mobile.attach.skipped', { path: x.Path, reason: x.Reason })}
              </T>
            ))}
            {a.Notes.map((n) => (
              <T key={n} variant="small" style={{ textAlign: 'right' }}>
                {n}
              </T>
            ))}
          </View>
        ) : null}
      </View>
    );
  }
  const copy = async () => {
    await Clipboard.setStringAsync(turn.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
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
          {turn.tools.map((tool, index) => (
            <ToolCard key={(tool.id || tool.name) + ':' + index} tool={tool} />
          ))}
        </View>
      ) : null}
      {turn.content ? (
        <View style={turn.error ? { borderLeftColor: p.danger, borderLeftWidth: 3, paddingLeft: spacing.sm } : undefined}>
          <Markdown text={turn.content} />
        </View>
      ) : turn.pending ? (
        <T variant="muted">{t('mobile.chat.thinking')}</T>
      ) : turn.tools.length === 0 ? (
        <T variant="muted" style={{ fontStyle: 'italic' }}>
          {t('mobile.chat.emptyReply')}
        </T>
      ) : null}
      {!turn.pending ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' }}>
          {turn.stats ? (
            <T variant="small" style={{ flexShrink: 1 }}>
              {[turn.model, turn.stats.TotalMs ? formatDuration(i18n.language, turn.stats.TotalMs) : '', turn.stats.TotalTokens ? t('mobile.chat.tokens', { count: turn.stats.TotalTokens }) : '']
                .filter(Boolean)
                .join(' · ')}
            </T>
          ) : null}
          <View style={{ flexDirection: 'row', gap: spacing.md, marginLeft: 'auto' }}>
            {turn.content ? (
              <Pressable onPress={() => void copy()} accessibilityRole="button" accessibilityLabel={t('mobile.chat.copyReply')} hitSlop={8}>
                <T variant="small" style={{ color: copied ? p.success : p.accent, fontWeight: '600' }}>
                  {copied ? t('common.copied') : t('common.copy')}
                </T>
              </Pressable>
            ) : null}
            {onInfo && (turn.stats || turn.runId) ? (
              <Pressable onPress={() => onInfo(turn)} accessibilityRole="button" accessibilityLabel={t('mobile.chat.turnInfo')} hitSlop={8}>
                <T variant="small" style={{ color: p.accent, fontWeight: '600' }}>
                  {t('mobile.common.details')}
                </T>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}

/** A tool call: status, name, and duration; tap to see its arguments and output when they are known. */
function ToolCard({ tool }: { tool: ToolLine }) {
  const p = useTheme();
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [full, setFull] = useState(false);
  const expandable = !!(tool.arguments || tool.result);
  const status = ['ok', 'fail', 'running', 'canceled'].includes(tool.status) ? tool.status : 'ok';
  const color = tool.status === 'fail' ? p.danger : tool.status === 'running' ? p.warning : tool.status === 'canceled' ? p.muted : p.success;
  const result = tool.result ?? '';
  const shownResult = full || result.length <= RESULT_PREVIEW ? result : result.slice(0, RESULT_PREVIEW) + '…';
  return (
    <View style={open ? { borderWidth: 1, borderColor: p.line, borderRadius: radius.sm, overflow: 'hidden' } : undefined}>
      <Pressable
        disabled={!expandable}
        onPress={() => setOpen((v) => !v)}
        accessibilityRole={expandable ? 'button' : undefined}
        accessibilityState={expandable ? { expanded: open } : undefined}
        accessibilityLabel={tool.name + ', ' + t('mobile.chat.toolStatus.' + status)}
        style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center', minHeight: 28, paddingHorizontal: open ? spacing.sm : 0, backgroundColor: open ? p.panelAlt : undefined }}
      >
        <T variant="small" style={{ color }}>
          {tool.status === 'fail' ? '✗' : tool.status === 'running' ? '…' : tool.status === 'canceled' ? '–' : '✓'}
        </T>
        <T variant="mono" style={{ flex: 1 }} numberOfLines={1}>
          {tool.name}
        </T>
        {tool.elapsedMs ? <T variant="small">{formatDuration(i18n.language, tool.elapsedMs)}</T> : null}
        {expandable ? <T variant="small">{open ? '▾' : '▸'}</T> : null}
      </Pressable>
      {open ? (
        <View style={{ padding: spacing.sm, gap: spacing.sm }}>
          {tool.arguments ? (
            <View style={{ gap: spacing.xs }}>
              <T variant="small" style={{ fontWeight: '600' }}>
                {t('mobile.chat.arguments')}
              </T>
              <ScrollView horizontal style={{ backgroundColor: p.codeBg, borderRadius: radius.sm }} contentContainerStyle={{ padding: spacing.sm }}>
                <T variant="mono" selectable style={{ fontSize: font.mono - 1 }}>
                  {prettyJson(tool.arguments)}
                </T>
              </ScrollView>
            </View>
          ) : null}
          <View style={{ gap: spacing.xs }}>
            <T variant="small" style={{ fontWeight: '600' }}>
              {t('mobile.chat.result')}
            </T>
            {result ? (
              <View style={{ backgroundColor: p.codeBg, borderRadius: radius.sm, padding: spacing.sm }}>
                <T variant="mono" selectable style={{ fontSize: font.mono - 1 }}>
                  {shownResult}
                </T>
              </View>
            ) : (
              <T variant="muted">{t('mobile.chat.noResult')}</T>
            )}
            {result.length > RESULT_PREVIEW ? (
              <Pressable onPress={() => setFull((v) => !v)} hitSlop={8} accessibilityRole="button">
                <T variant="small" style={{ color: p.accent, fontWeight: '600' }}>
                  {full ? t('mobile.common.less') : t('mobile.chat.showAll', { count: result.length })}
                </T>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}

/** The `/help` card: every chat command, tap one to put it in the message box. */
function HelpCard({ onCommand }: { onCommand?: (command: string) => void }) {
  const p = useTheme();
  const { t } = useTranslation();
  return (
    <View style={{ borderWidth: 1, borderColor: p.line, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm, backgroundColor: p.panel }}>
      <T variant="title">{t('mobile.chat.helpTitle')}</T>
      <T variant="small">{t('mobile.chat.helpIntro')}</T>
      {CHAT_COMMANDS.map((c) => (
        <Pressable
          key={c.command}
          onPress={() => onCommand?.('/' + c.command + (c.args ? ' ' : ''))}
          accessibilityRole="button"
          style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'baseline', minHeight: 32, paddingVertical: 2 }}
        >
          <T variant="mono" style={{ color: p.accent, minWidth: 116 }}>
            {'/' + c.command}
          </T>
          <T variant="small" style={{ flex: 1, color: p.text }}>
            {t('mobile.cmd.' + c.command)}
          </T>
        </Pressable>
      ))}
      <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'baseline' }}>
        <T variant="mono" style={{ color: p.accent, minWidth: 116 }}>
          {'# …'}
        </T>
        <T variant="small" style={{ flex: 1, color: p.text }}>
          {t('mobile.cmd.remember')}
        </T>
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'baseline' }}>
        <T variant="mono" style={{ color: p.accent, minWidth: 116 }}>
          {'@path'}
        </T>
        <T variant="small" style={{ flex: 1, color: p.text }}>
          {t('mobile.cmd.mention')}
        </T>
      </View>
    </View>
  );
}
