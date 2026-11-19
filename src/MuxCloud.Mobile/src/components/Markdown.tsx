import React, { useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View, type TextStyle } from 'react-native';
import { marked, type Token, type Tokens } from 'marked';
import { useTheme } from '@/theme/ThemeContext';
import { font, radius, spacing } from '@/theme/palette';
import type { Palette } from '@/theme/palette';
import { splitDetails } from '@/lib/chatStats';
import { CodeBlock } from './CodeBlock';

/**
 * Markdown for assistant replies, rendered to native views (no WebView): headings, paragraphs, emphasis, inline and
 * fenced code (syntax colored, with copy), lists, quotes, rules, tables, links (opened in the system browser), and
 * collapsible `<details>` blocks. Other raw HTML is shown as text.
 */
export function Markdown({ text }: { text: string }) {
  const segments = useMemo(() => splitDetails(text ?? ''), [text]);
  if (segments.length === 1 && segments[0].kind === 'markdown') return <MarkdownBody text={segments[0].text} />;
  return (
    <View style={{ gap: spacing.sm }}>
      {segments.map((seg, i) => (seg.kind === 'markdown' ? <MarkdownBody key={i} text={seg.text} /> : <Details key={i} summary={seg.summary} body={seg.body} initiallyOpen={seg.open} />))}
    </View>
  );
}

function Details({ summary, body, initiallyOpen }: { summary: string; body: string; initiallyOpen: boolean }) {
  const p = useTheme();
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <View style={{ borderWidth: 1, borderColor: p.line, borderRadius: radius.sm, overflow: 'hidden' }}>
      <Pressable onPress={() => setOpen((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded: open }} style={{ flexDirection: 'row', gap: spacing.sm, padding: spacing.md, backgroundColor: p.panelAlt }}>
        <Text style={{ color: p.muted }}>{open ? '▾' : '▸'}</Text>
        <Text style={{ flex: 1, color: p.text, fontWeight: '600', fontSize: font.body }}>{summary || '…'}</Text>
      </Pressable>
      {open ? (
        <View style={{ padding: spacing.md }}>
          <MarkdownBody text={body} />
        </View>
      ) : null}
    </View>
  );
}

function MarkdownBody({ text }: { text: string }) {
  const p = useTheme();
  const tokens = useMemo(() => {
    try {
      return marked.lexer(text ?? '');
    } catch {
      return [{ type: 'paragraph', raw: text, text, tokens: [{ type: 'text', raw: text, text }] } as Token];
    }
  }, [text]);
  return <View style={{ gap: spacing.sm }}>{tokens.map((t, i) => block(t, i, p))}</View>;
}

function block(token: Token, key: number, p: Palette): React.ReactNode {
  const base: TextStyle = { color: p.text, fontSize: font.body, lineHeight: 22 };
  switch (token.type) {
    case 'space':
      return null;
    case 'heading': {
      const t = token as Tokens.Heading;
      const size = [0, 22, 19, 17, 16, 15, 15][t.depth] ?? 15;
      return (
        <Text key={key} accessibilityRole="header" style={[base, { fontSize: size, fontWeight: '700' }]}>
          {inline(t.tokens, p)}
        </Text>
      );
    }
    case 'paragraph':
      return (
        <Text key={key} style={base} selectable>
          {inline((token as Tokens.Paragraph).tokens, p)}
        </Text>
      );
    case 'text': {
      const t = token as Tokens.Text;
      return (
        <Text key={key} style={base} selectable>
          {t.tokens ? inline(t.tokens, p) : t.text}
        </Text>
      );
    }
    case 'code': {
      const c = token as Tokens.Code;
      return <CodeBlock key={key} code={c.text} lang={c.lang} />;
    }
    case 'blockquote':
      return (
        <View key={key} style={{ borderLeftWidth: 3, borderLeftColor: p.line, paddingLeft: spacing.md, gap: spacing.xs }}>
          {(token as Tokens.Blockquote).tokens.map((t, i) => block(t, i, p))}
        </View>
      );
    case 'list': {
      const list = token as Tokens.List;
      const start = typeof list.start === 'number' ? list.start : 1;
      return (
        <View key={key} style={{ gap: spacing.xs }}>
          {list.items.map((item, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Text style={[base, { minWidth: 18 }]}>{list.ordered ? start + i + '.' : item.task ? (item.checked ? '☑' : '☐') : '•'}</Text>
              <View style={{ flex: 1, gap: spacing.xs }}>{item.tokens.map((t, j) => block(t, j, p))}</View>
            </View>
          ))}
        </View>
      );
    }
    case 'hr':
      return <View key={key} style={{ height: StyleSheet.hairlineWidth, backgroundColor: p.line, marginVertical: spacing.sm }} />;
    case 'table': {
      const table = token as Tokens.Table;
      return (
        <ScrollView key={key} horizontal>
          <View style={{ borderWidth: StyleSheet.hairlineWidth, borderColor: p.line, borderRadius: radius.sm }}>
            {[table.header, ...table.rows].map((row, r) => (
              <View key={r} style={{ flexDirection: 'row', backgroundColor: r === 0 ? p.panelAlt : undefined }}>
                {row.map((cell, c) => (
                  <View key={c} style={{ minWidth: 90, maxWidth: 240, padding: spacing.sm, borderColor: p.line, borderRightWidth: StyleSheet.hairlineWidth }}>
                    <Text style={[base, { fontWeight: r === 0 ? '600' : '400', fontSize: font.small }]}>{inline(cell.tokens, p)}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      );
    }
    case 'html':
      return (
        <Text key={key} style={[base, { fontFamily: 'Menlo', fontSize: font.mono }]} selectable>
          {(token as Tokens.HTML).text}
        </Text>
      );
    default:
      return 'raw' in token && token.raw ? (
        <Text key={key} style={base} selectable>
          {token.raw}
        </Text>
      ) : null;
  }
}

function inline(tokens: Token[] | undefined, p: Palette): React.ReactNode {
  if (!tokens) return null;
  return tokens.map((token, i) => {
    switch (token.type) {
      case 'strong':
        return (
          <Text key={i} style={{ fontWeight: '700' }}>
            {inline((token as Tokens.Strong).tokens, p)}
          </Text>
        );
      case 'em':
        return (
          <Text key={i} style={{ fontStyle: 'italic' }}>
            {inline((token as Tokens.Em).tokens, p)}
          </Text>
        );
      case 'del':
        return (
          <Text key={i} style={{ textDecorationLine: 'line-through' }}>
            {inline((token as Tokens.Del).tokens, p)}
          </Text>
        );
      case 'codespan':
        return (
          <Text key={i} style={{ fontFamily: 'Menlo', fontSize: font.mono, backgroundColor: p.codeBg }}>
            {(token as Tokens.Codespan).text}
          </Text>
        );
      case 'link': {
        const link = token as Tokens.Link;
        return (
          <Text
            key={i}
            accessibilityRole="link"
            style={{ color: p.accent, textDecorationLine: 'underline' }}
            onPress={() => {
              if (/^https?:\/\//i.test(link.href)) void Linking.openURL(link.href);
            }}
          >
            {inline(link.tokens, p)}
          </Text>
        );
      }
      case 'br':
        return '\n';
      case 'text': {
        const t = token as Tokens.Text;
        return t.tokens ? <Text key={i}>{inline(t.tokens, p)}</Text> : decode(t.text);
      }
      case 'escape':
        return (token as Tokens.Escape).text;
      default:
        return 'raw' in token ? token.raw : null;
    }
  });
}

function decode(text: string): string {
  return text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}
