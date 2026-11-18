import { useState } from 'react';
import { Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeContext';
import { Card, T } from './ui';

/**
 * The parity notice: this account can operate machines remotely, including approving tools, and how to turn that off.
 * `collapsible` shows the title and first sentence with a "Details" toggle, for list screens where the full text would
 * push the content down.
 */
export function RemoteNotice({ collapsible = false }: { collapsible?: boolean }) {
  const { t } = useTranslation();
  const p = useTheme();
  const [open, setOpen] = useState(!collapsible);
  const body = t('remote.body');
  const first = body.split(/(?<=[.!?\u3002])\s*/)[0];
  return (
    <Card>
      <T variant="title">{t('remote.title')}</T>
      <T variant="muted">{open ? body : first}</T>
      {open ? <T variant="small">{t('remote.disableHint', { setting: 'cloud.allowRemoteToolApproval' })}</T> : null}
      {collapsible ? (
        <Pressable onPress={() => setOpen((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded: open }} hitSlop={10} style={{ alignSelf: 'flex-start', minHeight: 32, justifyContent: 'center' }}>
          <T style={{ color: p.accent, fontWeight: '600' }}>{open ? t('mobile.common.less') : t('mobile.common.details')}</T>
        </Pressable>
      ) : null}
    </Card>
  );
}
