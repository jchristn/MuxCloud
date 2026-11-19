import { useState } from 'react';
import { RefreshControl, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Sheet } from '@/components/Sheet';
import { Badge, Button, ErrorBox, Field, KeyValues, ListRow, Loading, Notice, Screen, Section, T } from '@/components/ui';
import { groupCommands, normalizeChord, overridesAfter } from '@/lib/keybindings';
import { useAsync } from '@/state/useAsync';
import { useMachineApi } from '@/state/useMachineApi';
import type { MuxKeybindingCommand } from '@/types/mux';
import { spacing } from '@/theme/palette';

/**
 * The desktop and terminal keybindings, like the desktop's Keybindings window: every command with its default and current
 * chord, grouped by category and searchable. A phone has no key capture, so the chord is typed as text (ctrl+k,
 * alt+enter). Unbind removes it, and Reset restores the default.
 */
export default function KeybindingsScreen() {
  const { machineId } = useLocalSearchParams<{ machineId: string }>();
  const { t } = useTranslation();
  const api = useMachineApi(machineId);
  const commands = useAsync(() => api.keybindingCommands().then((r) => r.Items ?? []), [api]);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<{ command: MuxKeybindingCommand; chord: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const groups = groupCommands(commands.data ?? [], query);

  /** Saves one command's chord; the full override list goes along because PUT replaces it. */
  const apply = async (command: MuxKeybindingCommand, chord: string) => {
    setBusy(true);
    setError(null);
    try {
      const current = (await api.keybindingOverrides()).Items ?? [];
      await api.saveKeybindings(overridesAfter(current, command.CommandId, chord, command.DefaultChord));
      setEditing(null);
      await commands.reload();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  const chordLabel = (c: MuxKeybindingCommand) => c.EffectiveChord || t('mobile.keys.unbound');

  return (
    <Screen refreshControl={<RefreshControl refreshing={commands.loading && !!commands.data} onRefresh={() => void commands.reload()} />}>
      <Stack.Screen options={{ title: t('mobile.manage.keybindings') }} />
      <T variant="muted">{t('mobile.keys.intro')}</T>
      <Field label={t('mobile.keys.search')} value={query} onChangeText={setQuery} autoCapitalize="none" autoCorrect={false} clearButtonMode="while-editing" />
      {commands.error ? <ErrorBox error={commands.error} onRetry={() => void commands.reload()} /> : null}
      {error && !editing ? <ErrorBox error={error} /> : null}
      {commands.loading && !commands.data ? <Loading /> : null}
      {commands.data && groups.length === 0 ? <T variant="muted">{t('mobile.keys.noMatch')}</T> : null}
      {groups.map((g) => (
        <Section key={g.category} title={g.category || t('mobile.keys.other')}>
          <View style={{ marginHorizontal: -spacing.lg }}>
            {g.items.map((c) => (
              <ListRow
                key={c.CommandId}
                title={c.Title || c.CommandId}
                subtitle={c.CommandId}
                trailing={
                  <View style={{ alignItems: 'flex-end', gap: spacing.xs }}>
                    <T variant="mono">{chordLabel(c)}</T>
                    {c.Overridden ? <Badge tone="info" label={t('mobile.keys.changed')} /> : null}
                  </View>
                }
                onPress={() => {
                  setError(null);
                  setEditing({ command: c, chord: c.EffectiveChord ?? '' });
                }}
              />
            ))}
          </View>
        </Section>
      ))}

      <Sheet
        visible={editing !== null}
        title={editing?.command.Title || editing?.command.CommandId || ''}
        onClose={() => setEditing(null)}
        footer={
          editing ? (
            <>
              <Button title={t('common.save')} busy={busy} onPress={() => void apply(editing.command, editing.chord)} />
              {editing.command.EffectiveChord ? (
                <Button title={t('mobile.keys.unbind')} kind="secondary" disabled={busy} onPress={() => void apply(editing.command, '')} />
              ) : null}
              {editing.command.Overridden ? (
                <Button
                  title={t('mobile.keys.reset')}
                  kind="secondary"
                  disabled={busy}
                  onPress={() => void apply(editing.command, editing.command.DefaultChord ?? '')}
                />
              ) : null}
            </>
          ) : null
        }
      >
        {editing ? (
          <>
            <KeyValues
              rows={[
                [t('mobile.keys.command'), editing.command.CommandId],
                [t('mobile.keys.default'), editing.command.DefaultChord || t('mobile.keys.unbound')],
                [t('mobile.keys.current'), chordLabel(editing.command)],
              ]}
            />
            <Field
              label={t('mobile.keys.chord')}
              hint={t('mobile.keys.chordHint')}
              value={editing.chord}
              placeholder="ctrl+k"
              onChangeText={(chord) => setEditing({ ...editing, chord })}
              onBlur={() => setEditing({ ...editing, chord: normalizeChord(editing.chord) })}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {error ? <Notice tone="danger" text={error instanceof Error ? error.message : String(error)} /> : null}
          </>
        ) : null}
      </Sheet>
    </Screen>
  );
}
