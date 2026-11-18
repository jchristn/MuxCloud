import { useState } from 'react';
import { Alert, RefreshControl, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { spacing } from '@/theme/palette';
import { ObjectForm, type FieldHints } from './ObjectForm';
import { Sheet } from './Sheet';
import { Badge, Button, Empty, ErrorBox, ListRow, Loading, Screen, T } from './ui';

export type Item = Record<string, unknown>;

export interface RowAction {
  label: string;
  onPress: (item: Item) => Promise<void> | void;
}

/**
 * List, add, edit, and delete the items of a mux configuration collection (endpoints, MCP servers, prompts,
 * subagents, hooks, commands, keybindings). Saving writes the whole collection back, the way the local mux dashboard
 * does (`PUT {Items}`), so concurrent edits on the machine and here behave identically.
 */
export function CollectionEditor({
  title,
  intro,
  items,
  loading,
  error,
  reload,
  keyField,
  subtitle,
  badges,
  hints,
  template,
  onSave,
  onDelete,
  actions,
  addLabel,
  emptyLabel,
}: {
  title: string;
  intro?: string;
  items: Item[] | null;
  loading: boolean;
  error: unknown;
  reload: () => void;
  keyField: string;
  subtitle?: (item: Item) => string;
  badges?: (item: Item) => { label: string; tone?: 'neutral' | 'success' | 'danger' | 'warning' | 'info' }[];
  hints?: FieldHints;
  template: Item;
  onSave: (items: Item[]) => Promise<void>;
  /** Delete via a dedicated route; defaults to saving the collection without the item. */
  onDelete?: (item: Item) => Promise<void>;
  actions?: RowAction[];
  addLabel?: string;
  /** Empty-list title; defaults to a generic phrase. */
  emptyLabel?: string;
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState<{ index: number; draft: Item } | null>(null);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<unknown>(null);
  const list = items ?? [];

  const save = async () => {
    if (!editing) return;
    const name = String(editing.draft[keyField] ?? '').trim();
    if (!name) {
      setSaveError(new Error(t('mobile.form.keyRequired', { field: keyField })));
      return;
    }
    const duplicate = list.some((it, i) => i !== editing.index && String(it[keyField]) === name);
    if (duplicate) {
      setSaveError(new Error(t('mobile.form.duplicate', { name })));
      return;
    }
    setBusy(true);
    setSaveError(null);
    try {
      const next = editing.index < 0 ? [...list, editing.draft] : list.map((it, i) => (i === editing.index ? editing.draft : it));
      await onSave(next);
      setEditing(null);
    } catch (e) {
      setSaveError(e);
    } finally {
      setBusy(false);
    }
  };

  const remove = (index: number) => {
    const item = list[index];
    Alert.alert(t('mobile.form.deleteTitle', { name: String(item[keyField] ?? '') }), t('mobile.form.deleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            if (onDelete) await onDelete(item);
            else await onSave(list.filter((_, i) => i !== index));
            setEditing(null);
          } catch (e) {
            setSaveError(e);
          }
        },
      },
    ]);
  };

  return (
    <Screen refreshControl={<RefreshControl refreshing={loading && items !== null} onRefresh={reload} />}>
      {intro ? <T variant="muted">{intro}</T> : null}
      <Button title={addLabel ?? t('common.add')} onPress={() => setEditing({ index: -1, draft: { ...template } })} />
      {error ? <ErrorBox error={error} onRetry={reload} /> : null}
      {loading && items === null ? <Loading /> : null}
      {!loading && !error && list.length === 0 ? <Empty title={emptyLabel ?? t('mobile.form.emptyTitle', { name: title })} /> : null}
      <View style={{ marginHorizontal: -spacing.lg }}>
        {list.map((item, index) => (
          <ListRow
            key={String(item[keyField] ?? index)}
            title={String(item[keyField] ?? '') || t('mobile.form.unnamed')}
            subtitle={subtitle?.(item)}
            trailing={
              <View style={{ gap: spacing.xs, alignItems: 'flex-end' }}>
                {(badges?.(item) ?? []).map((b) => (
                  <Badge key={b.label} label={b.label} tone={b.tone} />
                ))}
              </View>
            }
            onPress={() => {
              setSaveError(null);
              setEditing({ index, draft: JSON.parse(JSON.stringify(item)) as Item });
            }}
          />
        ))}
      </View>
      <Sheet
        visible={editing !== null}
        title={editing && editing.index >= 0 ? String(list[editing.index]?.[keyField] ?? '') : addLabel ?? t('common.add')}
        onClose={() => setEditing(null)}
        footer={
          <>
            {saveError ? <ErrorBox error={saveError} /> : null}
            <Button title={busy ? t('common.saving') : t('common.save')} busy={busy} onPress={save} />
            {editing && editing.index >= 0
              ? (actions ?? []).map((a) => (
                  <Button
                    key={a.label}
                    title={a.label}
                    kind="secondary"
                    onPress={async () => {
                      try {
                        await a.onPress(list[editing.index]);
                      } catch (e) {
                        setSaveError(e);
                      }
                    }}
                  />
                ))
              : null}
            {editing && editing.index >= 0 ? <Button title={t('common.delete')} kind="danger" onPress={() => remove(editing.index)} /> : null}
          </>
        }
      >
        {editing ? <ObjectForm value={editing.draft} hints={hints} onChange={(draft) => setEditing({ ...editing, draft })} /> : null}
      </Sheet>
    </Screen>
  );
}
