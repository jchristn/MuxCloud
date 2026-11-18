import { useState } from 'react';
import { Alert, RefreshControl, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ObjectForm } from '@/components/ObjectForm';
import { Sheet } from '@/components/Sheet';
import { Badge, Button, ErrorBox, ListRow, Loading, Screen, T } from '@/components/ui';
import { useAsync } from '@/state/useAsync';
import { useMachineApi } from '@/state/useMachineApi';
import { spacing } from '@/theme/palette';

interface PaletteDto {
  Id: string;
  Name: string;
  Dark: boolean;
  BuiltIn: boolean;
  Base?: string | null;
  Colors: Record<string, string | null>;
}

interface PaletteList {
  Active?: string | null;
  DefaultId: string;
  CursorBlink: boolean;
  Palettes: PaletteDto[];
}

/** The machine's color palettes (shared by its terminal, desktop app, dashboard, and VS Code): choose, customize, delete. */
export default function Palettes() {
  const { machineId } = useLocalSearchParams<{ machineId: string }>();
  const { t } = useTranslation();
  const api = useMachineApi(machineId);
  const list = useAsync(() => api.palettes().then((r) => r as unknown as PaletteList), [api]);
  const [editing, setEditing] = useState<PaletteDto | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const data = list.data;
  const active = data?.Active ?? 'system';

  const activate = async (id: string) => {
    try {
      list.setData((await api.setActivePalette(id)) as unknown as PaletteList);
    } catch (e) {
      setError(e);
    }
  };

  const save = async () => {
    if (!editing) return;
    setBusy(true);
    try {
      const body = { Palette: { ...editing, BuiltIn: false, Id: editing.BuiltIn ? '' : editing.Id, Base: editing.BuiltIn ? editing.Id : editing.Base }, Activate: true };
      list.setData((await api.savePalette(body as unknown as { Palette: Record<string, unknown>; Activate: boolean })) as unknown as PaletteList);
      setEditing(null);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  const remove = (p: PaletteDto) =>
    Alert.alert(t('mobile.form.deleteTitle', { name: p.Name }), t('mobile.form.deleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            list.setData((await api.deletePalette(p.Id)) as unknown as PaletteList);
            setEditing(null);
          } catch (e) {
            setError(e);
          }
        },
      },
    ]);

  return (
    <Screen refreshControl={<RefreshControl refreshing={list.loading && !!data} onRefresh={() => void list.reload()} />}>
      <Stack.Screen options={{ title: t('mobile.manage.palettes') }} />
      <T variant="muted">{t('mobile.manage.palettesIntro')}</T>
      {list.loading && !data ? <Loading /> : null}
      {list.error ? <ErrorBox error={list.error} onRetry={() => void list.reload()} /> : null}
      {error ? <ErrorBox error={error} /> : null}
      <View style={{ marginHorizontal: -spacing.lg }}>
        <ListRow title={t('mobile.palettes.system')} selected={active === 'system'} onPress={() => void activate('system')} />
        {(data?.Palettes ?? []).map((p) => (
          <ListRow
            key={p.Id}
            title={p.Name}
            subtitle={p.Dark ? t('mobile.palettes.dark') : t('mobile.palettes.light')}
            selected={active === p.Id}
            leading={<View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: p.Colors?.accent ?? p.Colors?.Accent ?? '#888' }} />}
            trailing={p.BuiltIn ? <Badge label={t('mobile.palettes.builtIn')} /> : <Badge tone="info" label={t('mobile.palettes.custom')} />}
            onPress={() => void activate(p.Id)}
            onLongPress={() => setEditing(JSON.parse(JSON.stringify(p)) as PaletteDto)}
          />
        ))}
      </View>
      <T variant="small">{t('mobile.palettes.longPress')}</T>
      <Sheet
        visible={editing !== null}
        title={editing?.Name ?? ''}
        onClose={() => setEditing(null)}
        footer={
          <>
            <Button title={editing?.BuiltIn ? t('mobile.palettes.saveCopy') : t('common.save')} busy={busy} onPress={() => void save()} />
            {editing && !editing.BuiltIn ? <Button title={t('common.delete')} kind="danger" onPress={() => remove(editing)} /> : null}
          </>
        }
      >
        {editing ? (
          <ObjectForm
            value={{ Name: editing.Name, Dark: editing.Dark, Colors: editing.Colors }}
            onChange={(v) => setEditing({ ...editing, Name: String(v.Name ?? ''), Dark: !!v.Dark, Colors: (v.Colors ?? {}) as Record<string, string | null> })}
          />
        ) : null}
      </Sheet>
    </Screen>
  );
}
