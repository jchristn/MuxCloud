import { useState } from 'react';
import { Alert, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { MuxApi } from '@/relay/muxApi';
import type { MuxSessionSummary, MuxSessionTag } from '@/types/mux';
import { spacing } from '@/theme/palette';
import { Sheet } from './Sheet';
import { Button, ErrorBox, Field, Segmented, T } from './ui';

/**
 * Manage one conversation, matching the local dashboard: rename (PUT /sessions with the full transcript), add and
 * remove labels and tags (POST /sessions/{id}/metadata), export as Markdown or JSON (shared through the system share
 * sheet), and delete.
 */
export function SessionActions({ api, session, onClose, onChanged }: { api: MuxApi; session: MuxSessionSummary | null; onClose: () => void; onChanged: () => void }) {
  const { t } = useTranslation();
  // The parent renders this with key={session.Id}, so fields start from the session being managed.
  const [title, setTitle] = useState(session?.Title ?? '');
  const [labels, setLabels] = useState((session?.Labels ?? []).join(', '));
  const [tags, setTags] = useState((session?.Tags ?? []).map((tg) => tg.Key + '=' + tg.Value).join(', '));
  const [format, setFormat] = useState<'md' | 'json'>('md');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);

  if (!session) return null;

  const run = async (name: string, action: () => Promise<void>) => {
    setBusy(name);
    setError(null);
    try {
      await action();
      onChanged();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(null);
    }
  };

  const rename = () =>
    run('rename', async () => {
      const d = await api.session(session.Id);
      await api.saveSession({ Id: d.Id, Title: title.trim(), EndpointName: d.EndpointName, Model: d.Model, Labels: d.Labels, Tags: d.Tags, Messages: d.Messages });
    });

  const saveMetadata = () =>
    run('metadata', async () => {
      const nextLabels = labels.split(',').map((s) => s.trim()).filter(Boolean);
      const nextTags: MuxSessionTag[] = tags
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((pair) => {
          const eq = pair.indexOf('=');
          return eq < 0 ? { Key: pair, Value: '' } : { Key: pair.slice(0, eq).trim(), Value: pair.slice(eq + 1).trim() };
        });
      const before = session.Labels ?? [];
      const beforeTags = session.Tags ?? [];
      await api.patchMetadata(session.Id, {
        AddLabels: nextLabels.filter((l) => !before.includes(l)),
        RemoveLabels: before.filter((l) => !nextLabels.includes(l)),
        SetTags: nextTags,
        RemoveTagKeys: beforeTags.filter((tg) => !nextTags.some((n) => n.Key === tg.Key)).map((tg) => tg.Key),
      });
    });

  const exportIt = () =>
    run('export', async () => {
      const file = await api.exportSession(session.Id, format);
      const path = (FileSystem.cacheDirectory ?? '') + (file.Filename || session.Id + '.' + format);
      await FileSystem.writeAsStringAsync(path, file.Content);
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(path, { mimeType: format === 'json' ? 'application/json' : 'text/markdown' });
    });

  const remove = () =>
    Alert.alert(t('mobile.session.deleteTitle', { title: session.Title || t('conversations.untitled') }), t('mobile.session.deleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () =>
          void run('delete', async () => {
            await api.deleteSession(session.Id);
            onClose();
          }),
      },
    ]);

  return (
    <Sheet visible title={session.Title || t('conversations.untitled')} onClose={onClose}>
      {error ? <ErrorBox error={error} /> : null}
      <Field label={t('mobile.session.title')} value={title} onChangeText={setTitle} />
      <Button title={t('mobile.session.rename')} kind="secondary" busy={busy === 'rename'} onPress={() => void rename()} />
      <Field label={t('conversations.colLabels')} hint={t('mobile.session.labelsHint')} value={labels} onChangeText={setLabels} autoCapitalize="none" />
      <Field label={t('mobile.session.tags')} hint={t('mobile.session.tagsHint')} value={tags} onChangeText={setTags} autoCapitalize="none" />
      <Button title={t('mobile.session.saveMetadata')} kind="secondary" busy={busy === 'metadata'} onPress={() => void saveMetadata()} />
      <View style={{ gap: spacing.sm }}>
        <T variant="label">{t('mobile.session.export')}</T>
        <Segmented label={t('mobile.session.export')} value={format} onChange={setFormat} options={[{ value: 'md', label: 'Markdown' }, { value: 'json', label: 'JSON' }]} />
        <Button title={t('mobile.session.share')} kind="secondary" busy={busy === 'export'} onPress={() => void exportIt()} />
      </View>
      <Button title={t('common.delete')} kind="danger" busy={busy === 'delete'} onPress={remove} />
    </Sheet>
  );
}
