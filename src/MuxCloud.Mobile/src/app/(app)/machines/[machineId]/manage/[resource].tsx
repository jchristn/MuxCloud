import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Redirect, Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { CollectionEditor, type Item, type RowAction } from '@/components/CollectionEditor';
import { Sheet } from '@/components/Sheet';
import { Badge, Button, Empty, ErrorBox, KeyValues, ListRow, Loading, Notice, Screen, T } from '@/components/ui';
import { collectionFor, SCREENS } from '@/lib/resources';
import { useAsync } from '@/state/useAsync';
import { useMachineApi } from '@/state/useMachineApi';
import type { MuxMcpValidation, MuxModelLoad, MuxPluginConfig } from '@/types/mux';
import { useTheme } from '@/theme/ThemeContext';
import { font, radius, spacing } from '@/theme/palette';

type McpState = { state: 'checking' } | { state: 'done'; result: MuxMcpValidation };

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
  const p = useTheme();
  const [validation, setValidation] = useState<{ name: string; result: MuxModelLoad | null; error?: string } | null>(null);
  const [importing, setImporting] = useState<{ name: string; models: string[]; configured: string[]; picked: string[]; error?: string } | null>(null);
  const [mcp, setMcp] = useState<Record<string, McpState>>({});
  const [mcpDetails, setMcpDetails] = useState<MuxMcpValidation | null>(null);
  const [copied, setCopied] = useState(false);
  const isMcp = config?.segment === 'mcp';

  // MCP servers: test every server when the list opens, so each row shows whether it connects.
  const testAll = useCallback((items: Item[]) => {
    const names = items.map((i) => String(i.Name ?? '')).filter(Boolean);
    void Promise.resolve().then(() => setMcp(Object.fromEntries(names.map((n) => [n, { state: 'checking' } as McpState]))));
    for (const name of names) {
      void api
        .validateMcp(name)
        .then((result) => setMcp((m) => ({ ...m, [name]: { state: 'done', result } })))
        .catch((e: unknown) =>
          setMcp((m) => ({ ...m, [name]: { state: 'done', result: { Name: name, Connected: false, ToolCount: 0, Error: e instanceof Error ? e.message : String(e) } } })),
        );
    }
  }, [api]);
  useEffect(() => {
    if (isMcp && data.data) testAll(data.data);
  }, [isMcp, data.data, testAll]);

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
      closesEditor: true,
      onPress: async (item) => {
        const name = String(item.Name);
        setMcp((m) => ({ ...m, [name]: { state: 'checking' } }));
        const result = await api.validateMcp(name);
        setMcp((m) => ({ ...m, [name]: { state: 'done', result } }));
        setMcpDetails(result);
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
      label: t('mobile.endpoint.validate'),
      closesEditor: true,
      onPress: async (item) => {
        const name = String(item.Name);
        setValidation({ name, result: null });
        try {
          setValidation({ name, result: await api.loadModel(name) });
        } catch (e) {
          setValidation({ name, result: null, error: e instanceof Error ? e.message : String(e) });
        }
      },
    });
    actions.push({
      label: t('mobile.endpoint.duplicate'),
      closesEditor: true,
      onPress: async (item) => {
        const names = new Set((data.data ?? []).map((e) => String(e.Name)));
        let name = String(item.Name) + '-copy';
        for (let i = 2; names.has(name); i++) name = String(item.Name) + '-copy-' + i;
        await save([...(data.data ?? []), { ...JSON.parse(JSON.stringify(item)), Name: name, IsDefault: false }]);
        Alert.alert(t('mobile.endpoint.duplicated', { name }), item.ApiKeySet ? t('mobile.endpoint.duplicatedKey') : '');
      },
    });
    actions.push({
      label: t('mobile.manage.importModels'),
      closesEditor: true,
      onPress: async (item) => {
        const name = String(item.Name);
        setImporting({ name, models: [], configured: [], picked: [] });
        const r = await api.endpointModels(name);
        if (!r.Success) {
          setImporting({ name, models: [], configured: [], picked: [], error: r.ErrorMessage || t('mobile.manage.importFailed') });
          return;
        }
        const ids = (r.Models ?? []).map((m) => (typeof m === 'string' ? m : m.Id ?? m.Name ?? '')).filter(Boolean);
        const configured = (data.data ?? []).map((e) => String(e.Model ?? ''));
        setImporting({ name, models: ids, configured, picked: [] });
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
        addLabel={t('mobile.manage.addOne.' + (config.stringsFrom ?? config.segment))}
        emptyLabel={t('mobile.manage.none.' + (config.stringsFrom ?? config.segment))}
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
        status={
          isMcp
            ? (item) => {
                const st = mcp[String(item.Name)];
                const color = !st || st.state === 'checking' ? p.warning : st.result.Connected ? p.success : p.danger;
                return (
                  <Pressable
                    onPress={() => (st?.state === 'done' ? setMcpDetails(st.result) : undefined)}
                    accessibilityRole="button"
                    accessibilityLabel={!st || st.state === 'checking' ? t('mobile.mcp.checking') : st.result.Connected ? t('mobile.manage.validateOk') : t('mobile.manage.validateFailed')}
                    hitSlop={10}
                  >
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
                  </Pressable>
                );
              }
            : undefined
        }
        extraButtons={isMcp && (data.data ?? []).length > 0 ? <Button kind="secondary" title={t('mobile.mcp.testAll')} onPress={() => testAll(data.data ?? [])} /> : null}
      />
      <Sheet visible={validation !== null} title={t('mobile.endpoint.validateTitle', { name: validation?.name ?? '' })} onClose={() => setValidation(null)}>
        {validation && !validation.result && !validation.error ? <Loading label={t('mobile.endpoint.validating')} /> : null}
        {validation?.result?.Ok ? <Notice tone="success" text={t('mobile.endpoint.ready')} /> : null}
        {validation?.result && !validation.result.Ok ? (
          <Notice tone="danger" text={validation.result.Reachable ? t('mobile.endpoint.reachableNotReady') : t('mobile.endpoint.unreachable')} />
        ) : null}
        {validation?.result?.Error || validation?.error ? (
          <View style={{ backgroundColor: p.codeBg, borderRadius: radius.sm, padding: spacing.md }}>
            <T variant="mono" selectable style={{ fontSize: font.mono - 1 }}>
              {validation.result?.Error || validation.error}
            </T>
          </View>
        ) : null}
      </Sheet>
      <Sheet
        visible={importing !== null}
        title={t('mobile.endpoint.importTitle', { name: importing?.name ?? '' })}
        onClose={() => setImporting(null)}
        footer={
          importing && importing.models.length > 0 ? (
            <>
              <Button
                title={t('mobile.endpoint.importPicked', { count: importing.picked.length })}
                disabled={importing.picked.length === 0}
                onPress={async () => {
                  try {
                    const saved = await api.importModels(importing.name, importing.picked);
                    data.setData((saved.Items ?? []) as unknown as Item[]);
                    setImporting(null);
                  } catch (e) {
                    setImporting({ ...importing, error: e instanceof Error ? e.message : String(e) });
                  }
                }}
              />
              <Button
                kind="secondary"
                title={importing.picked.length === importing.models.filter((m) => !importing.configured.includes(m)).length ? t('mobile.endpoint.pickNone') : t('mobile.endpoint.pickNew')}
                onPress={() => {
                  const fresh = importing.models.filter((m) => !importing.configured.includes(m));
                  setImporting({ ...importing, picked: importing.picked.length === fresh.length ? [] : fresh });
                }}
              />
            </>
          ) : null
        }
      >
        {importing?.error ? <ErrorBox error={new Error(importing.error)} /> : null}
        {importing && importing.models.length === 0 && !importing.error ? <Loading /> : null}
        {importing && importing.models.length > 0 ? <T variant="muted">{t('mobile.endpoint.importIntro')}</T> : null}
        <View style={{ marginHorizontal: -spacing.lg }}>
          {(importing?.models ?? []).map((m) => {
            const isConfigured = importing?.configured.includes(m) ?? false;
            const picked = importing?.picked.includes(m) ?? false;
            return (
              <ListRow
                key={m}
                title={m}
                selected={picked}
                trailing={isConfigured ? <Badge label={t('mobile.endpoint.configured')} tone="success" /> : null}
                onPress={() =>
                  importing && setImporting({ ...importing, picked: picked ? importing.picked.filter((x) => x !== m) : [...importing.picked, m] })
                }
              />
            );
          })}
        </View>
      </Sheet>
      <Sheet
        visible={mcpDetails !== null}
        title={mcpDetails?.Name ?? ''}
        onClose={() => setMcpDetails(null)}
        footer={
          mcpDetails && (mcpDetails.Details || mcpDetails.Error) ? (
            <Button
              kind="secondary"
              title={copied ? t('common.copied') : t('mobile.mcp.copyDetails')}
              onPress={async () => {
                await Clipboard.setStringAsync([mcpDetails.Error, mcpDetails.Details].filter(Boolean).join('\n\n'));
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            />
          ) : null
        }
      >
        {mcpDetails ? (
          <>
            <Notice tone={mcpDetails.Connected ? 'success' : 'danger'} text={mcpDetails.Connected ? t('mobile.manage.validateOk') : mcpDetails.Error || t('mobile.manage.validateFailed')} />
            <KeyValues
              rows={[
                [t('mobile.mcp.method'), mcpDetails.Method || '–'],
                [t('mobile.mcp.tools'), String(mcpDetails.ToolCount ?? 0)],
                [t('mobile.mcp.elapsed'), mcpDetails.ElapsedMs ? mcpDetails.ElapsedMs + ' ms' : '–'],
              ]}
            />
            {mcpDetails.Details ? (
              <View style={{ backgroundColor: p.codeBg, borderRadius: radius.sm, padding: spacing.md }}>
                <T variant="mono" selectable style={{ fontSize: font.mono - 1 }}>
                  {mcpDetails.Details}
                </T>
              </View>
            ) : null}
            {(mcpDetails.Tools ?? []).length > 0 ? (
              <View style={{ gap: spacing.xs }}>
                <T variant="small" style={{ fontWeight: '600' }}>
                  {t('mobile.mcp.toolNames')}
                </T>
                {(mcpDetails.Tools ?? []).map((tool, i) => {
                  const name = typeof tool === 'string' ? tool : tool.Name ?? '';
                  const desc = typeof tool === 'string' ? '' : tool.Description ?? '';
                  return (
                    <View key={name + i}>
                      <T variant="mono">{name}</T>
                      {desc ? (
                        <T variant="small" numberOfLines={2}>
                          {desc}
                        </T>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            ) : null}
          </>
        ) : null}
      </Sheet>
    </>
  );
}
