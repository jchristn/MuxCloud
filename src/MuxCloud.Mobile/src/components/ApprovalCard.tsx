import { useEffect, useRef, useState } from 'react';
import { AppState, ScrollView, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { PendingApproval } from '@/lib/transcript';
import { useTheme } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/palette';
import { Button, T } from './ui';

/**
 * A tool approval prompt, as on the local dashboard: approve once, approve for the session, or deny, with the
 * auto-approve countdown. Like the dashboard, the countdown pauses while the app is in the background and decides
 * "approve" when it reaches zero.
 */
export function ApprovalCard({ approval, onDecide, machineName }: { approval: PendingApproval; onDecide: (decision: 'y' | 'always' | 'n') => void; machineName?: string }) {
  const p = useTheme();
  const { t } = useTranslation();
  const [remainingMs, setRemainingMs] = useState(approval.autoApproveSeconds * 1000);
  const { width } = useWindowDimensions();
  const stacked = width < 600;
  const decided = useRef(false);
  const last = useRef(0);

  // Render one card per tool call (key={toolCallId}); the countdown starts when the card mounts.
  useEffect(() => {
    if (approval.autoApproveSeconds <= 0) return;
    last.current = Date.now();
    const timer = setInterval(() => {
      const now = Date.now();
      const elapsed = now - last.current;
      last.current = now;
      if (AppState.currentState !== 'active') return;
      setRemainingMs((r) => {
        const next = r - elapsed;
        if (next <= 0 && !decided.current) {
          decided.current = true;
          onDecide('y');
        }
        return Math.max(0, next);
      });
    }, 200);
    return () => clearInterval(timer);
  }, [approval.toolCallId, approval.autoApproveSeconds, onDecide]);

  const decide = (d: 'y' | 'always' | 'n') => {
    if (decided.current) return;
    decided.current = true;
    onDecide(d);
  };

  let args = approval.arguments;
  try {
    args = JSON.stringify(JSON.parse(approval.arguments), null, 2);
  } catch {
    // Show arguments as sent.
  }

  return (
    <View
      accessibilityRole="alert"
      style={{ borderColor: p.warning, borderWidth: 1, backgroundColor: p.warningSoft, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm }}
    >
      <T variant="title">{t('mobile.approval.title', { tool: approval.toolName || t('mobile.approval.aTool') })}</T>
      {machineName ? <T variant="small">{t('mobile.approval.onMachine', { name: machineName })}</T> : null}
      <ScrollView style={{ maxHeight: 220, backgroundColor: p.codeBg, borderRadius: radius.sm }} contentContainerStyle={{ padding: spacing.md }}>
        <T variant="mono" selectable>
          {args || '{}'}
        </T>
      </ScrollView>
      <T variant="small">
        {approval.autoApproveSeconds > 0 ? t('mobile.approval.autoIn', { seconds: Math.ceil(remainingMs / 1000) }) : t('mobile.approval.noAuto')}
      </T>
      {/* Phones stack the three choices full width (large, unambiguous targets); tablets keep them on one row. */}
      <View style={{ flexDirection: stacked ? 'column' : 'row', gap: spacing.sm }}>
        <Button testID="approve" title={t('mobile.approval.approve')} onPress={() => decide('y')} style={stacked ? undefined : { flex: 1 }} />
        <Button testID="approve-always" title={t('mobile.approval.always')} kind="secondary" onPress={() => decide('always')} style={stacked ? undefined : { flex: 1 }} />
        <Button testID="deny" title={t('mobile.approval.deny')} kind="danger" onPress={() => decide('n')} style={stacked ? undefined : { flex: 1 }} />
      </View>
    </View>
  );
}
