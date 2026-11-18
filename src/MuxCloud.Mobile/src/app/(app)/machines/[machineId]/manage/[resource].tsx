import { useCallback } from 'react';
import { Alert } from 'react-native';
import { Redirect, Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { CollectionEditor, type Item, type RowAction } from '@/components/CollectionEditor';
import { Empty, Screen } from '@/components/ui';
import { collectionFor, SCREENS } from '@/lib/resources';
import { useAsync } from '@/state/useAsync';
import { useMachineApi } from '@/state/useMachineApi';
import type { MuxPluginConfig } from '@/types/mux';

/** Generic editor for a mux configuration collection (endpoints, MCP servers, prompts, subagents, hooks, commands, keybindings). */
export default function ResourceScreen() {
  const { machineId, resource } = useLocalSearchParams<{ machineId: string; resource: string }>();
  const { t } = useTranslation();
  const api = useMachineApi(machineId);
  const config = collectionFor(resource);

  const load = useCallback(async (): Promise<Item[]> => {
    if (!config) return [];
    if (config.pluginPart) {
      const plugin = await api.hooks();
      return (plugin[config.pluginPart] ?? []) as Item[];
    }
    if (config.segment === 'endpoints') return ((await api.endpointsDetail()).Items ?? []) as unknown as Item[];
    return (await api.collection(config.path)).Items ?? [];
  }, [api, config]);
  const data = useAsync(load, [load]);

  if ((SCREENS as readonly string[]).includes(resource)) {
    return <Redirect href={{ pathname: ('/machines/[machineId]/manage/' + resource) as never, params: { machineId } }} />;
  }
  if (!config) {
    return (
      <Screen>
        <Empty title={t('errors.NotFound')} />
      </Screen>
    );
  }

  const save = async (items: Item[]) => {
    if (config.pluginPart) {
      const current = await api.hooks();
      const next: MuxPluginConfig = { ...current, [config.pluginPart]: items };
      const saved = await api.saveHooks(next);
      data.setData((saved[config.pluginPart] ?? []) as Item[]);
      return;
    }
    const saved = await api.saveCollection(config.path, items);
    data.setData(saved.Items ?? items);
  };

  const actions: RowAction[] = [];
  if (config.segment === 'mcp') {
    actions.push({
      label: t('mobile.manage.validate'),
      onPress: async (item) => {
        const r = (await api.validateMcp(String(item.Name))) as { Connected?: boolean; Error?: string; Tools?: unknown[] };
        Alert.alert(
          r.Connected ? t('mobile.manage.validateOk') : t('mobile.manage.validateFailed'),
          r.Connected ? t('mobile.manage.validateTools', { count: Array.isArray(r.Tools) ? r.Tools.length : 0 }) : String(r.Error ?? ''),
        );
      },
    });
  }
  if (config.segment === 'endpoints') {
    actions.push({
      label: t('mobile.manage.setDefault'),
      onPress: async (item) => {
        const list = (data.data ?? []).map((e) => ({ ...e, IsDefault: e.Name === item.Name }));
        await save(list);
      },
    });
    actions.push({
      label: t('mobile.manage.importModels'),
      onPress: async (item) => {
        const r = await api.endpointModels(String(item.Name));
        if (!r.Success) throw new Error(r.ErrorMessage || t('mobile.manage.importFailed'));
        const ids = (r.Models ?? []).map((m) => (typeof m === 'string' ? m : m.Id ?? m.Name ?? '')).filter(Boolean);
        Alert.alert(t('mobile.manage.importTitle', { count: ids.length }), ids.slice(0, 20).join('\n') + (ids.length > 20 ? '\n...' : ''), [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('mobile.manage.importAll'),
            onPress: async () => {
              const saved = await api.importModels(String(item.Name), ids);
              data.setData((saved.Items ?? []) as unknown as Item[]);
            },
          },
        ]);
      },
    });
  }
  if (config.segment === 'prompts') {
    actions.push({
      label: t('mobile.manage.activate'),
      onPress: async (item) => {
        await save((data.data ?? []).map((p) => ({ ...p, IsActive: p.Name === item.Name })));
      },
    });
  }

  return (
    <>
      <Stack.Screen options={{ title: t(config.titleKey) }} />
      <CollectionEditor
        title={t(config.titleKey)}
        intro={t(config.introKey)}
        items={data.data}
        loading={data.loading}
        error={data.error}
        reload={() => void data.reload()}
        keyField={config.keyField}
        subtitle={config.subtitle}
        badges={(item) => [
          ...(item.IsDefault ? [{ label: t('mobile.new.default'), tone: 'success' as const }] : []),
          ...(item.IsActive ? [{ label: t('mobile.manage.active'), tone: 'success' as const }] : []),
          ...(item.ApiKeySet || item.AuthSecretSet ? [{ label: t('mobile.manage.secretSet'), tone: 'info' as const }] : []),
        ]}
        hints={config.hints}
        template={config.template}
        addLabel={t('mobile.manage.add', { name: t(config.titleKey) })}
        onSave={save}
        onDelete={
          config.deleteByName
            ? async (item) => {
                const r = await api.deleteNamed(config.path, String(item[config.keyField]));
                if (config.segment === 'endpoints') data.setData(((await api.endpointsDetail()).Items ?? []) as unknown as Item[]);
                else data.setData(r.Items ?? []);
              }
            : undefined
        }
        actions={actions}
      />
    </>
  );
}
