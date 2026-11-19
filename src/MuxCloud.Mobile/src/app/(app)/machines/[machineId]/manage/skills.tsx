import { useMemo, useState } from 'react';
import { Alert, RefreshControl, Switch, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Sheet } from '@/components/Sheet';
import { Badge, Button, ErrorBox, Field, ListRow, Loading, Notice, Screen, Section, Segmented, T, ToggleRow } from '@/components/ui';
import { buildSkillMarkdown, isValidSkillId, SKILL_INTERPRETERS, skillIdFromTitle, type SkillScaffold } from '@/lib/skillScaffold';
import { useAsync } from '@/state/useAsync';
import { useMachineApi } from '@/state/useMachineApi';
import type { MuxSkill, MuxSkillPack } from '@/types/mux';
import { useTheme } from '@/theme/ThemeContext';
import { spacing } from '@/theme/palette';

/** Skills (enable, category, view and edit SKILL.md, create, delete) and skill packs (browse, install, remove). */
export default function Skills() {
  const { machineId } = useLocalSearchParams<{ machineId: string }>();
  const { t } = useTranslation();
  const p = useTheme();
  const api = useMachineApi(machineId);
  const skills = useAsync(() => api.skills().then((r) => r.Items ?? []), [api]);
  const categories = useAsync(() => api.skillCategories().then((r) => r.Known ?? []).catch(() => [] as string[]), [api]);
  const packs = useAsync(() => api.skillPacks().then((r) => r.Items ?? []).catch(() => [] as MuxSkillPack[]), [api]);
  const [tab, setTab] = useState<'skills' | 'packs'>('skills');
  const [category, setCategory] = useState('');
  const [editing, setEditing] = useState<{ name: string; body: string; category: string; isNew: boolean } | null>(null);
  const [pack, setPack] = useState<MuxSkillPack | null>(null);
  // The desktop-style scaffold form; idEdited stops the id from following the title once the user types one.
  const [scaffold, setScaffold] = useState<(SkillScaffold & { idEdited: boolean }) | null>(null);
  const [scaffoldError, setScaffoldError] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const list = useMemo(() => (skills.data ?? []).filter((s) => !category || s.Category === category), [skills.data, category]);
  const cats = useMemo(() => [...new Set([...(categories.data ?? []), ...(skills.data ?? []).map((s) => s.Category)])].filter(Boolean).sort(), [categories.data, skills.data]);

  const toggle = async (s: MuxSkill) => {
    try {
      const r = await api.setSkillEnabled(s.Name, !s.Enabled);
      skills.setData(r.Items ?? skills.data);
    } catch (e) {
      setError(e);
    }
  };

  const open = async (s: MuxSkill) => {
    try {
      const d = await api.skill(s.Name);
      setEditing({ name: d.Name, body: d.Body ?? '', category: d.CategoryOverridden ? d.Category : '', isNew: false });
    } catch (e) {
      setError(e);
    }
  };

  const save = async () => {
    if (!editing) return;
    setBusy(true);
    setError(null);
    try {
      const r = editing.isNew ? await api.createSkill(editing.name.trim(), editing.body) : await api.saveSkillBody(editing.name, editing.body);
      if (!editing.isNew) await api.setSkillCategory(editing.name, editing.category.trim() || null);
      skills.setData(r.Items ?? skills.data);
      setEditing(null);
      void skills.reload();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  const newScaffold = () => {
    setScaffoldError(null);
    setScaffold({ id: '', title: '', description: '', interpreter: 'bash', mutating: false, idEdited: false });
  };

  /** Validates the scaffold like the desktop dialog; returns the id, or null after showing the problem. */
  const scaffoldId = (): string | null => {
    const id = scaffold?.id.trim() ?? '';
    if (!id) {
      setScaffoldError(t('mobile.skills.idRequired'));
      return null;
    }
    if (!isValidSkillId(id)) {
      setScaffoldError(t('mobile.skills.idInvalid'));
      return null;
    }
    if ((skills.data ?? []).some((s) => s.Name === id)) {
      setScaffoldError(t('mobile.skills.idTaken', { id }));
      return null;
    }
    return id;
  };

  const createScaffold = async () => {
    if (!scaffold) return;
    const id = scaffoldId();
    if (!id) return;
    setBusy(true);
    setScaffoldError(null);
    try {
      const r = await api.createSkill(id, buildSkillMarkdown({ ...scaffold, id }));
      skills.setData(r.Items ?? skills.data);
      setScaffold(null);
      void skills.reload();
    } catch (e) {
      setScaffoldError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  /** Hands the generated SKILL.md to the raw editor for authors who want to change more than the form covers. */
  const editScaffold = () => {
    if (!scaffold) return;
    const id = scaffoldId();
    if (!id) return;
    const body = buildSkillMarkdown({ ...scaffold, id });
    setScaffold(null);
    setTimeout(() => setEditing({ name: id, body, category: '', isNew: true }), 400);
  };

  const remove = (name: string) =>
    Alert.alert(t('mobile.form.deleteTitle', { name }), t('mobile.form.deleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            const r = await api.deleteSkill(name);
            skills.setData(r.Items ?? skills.data);
            setEditing(null);
          } catch (e) {
            setError(e);
          }
        },
      },
    ]);

  const openPack = async (id: string) => {
    try {
      setPack(await api.skillPack(id));
    } catch (e) {
      setError(e);
    }
  };

  const packAction = async (install: boolean, skill?: string) => {
    if (!pack) return;
    setBusy(true);
    try {
      if (install) await api.installPack(pack.Id, skill);
      else await api.removePack(pack.Id, skill);
      setPack(await api.skillPack(pack.Id));
      void packs.reload();
      void skills.reload();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen refreshControl={<RefreshControl refreshing={skills.loading && !!skills.data} onRefresh={() => { void skills.reload(); void packs.reload(); }} />}>
      <Stack.Screen options={{ title: t('mobile.manage.skills') }} />
      <Segmented value={tab} onChange={setTab} options={[{ value: 'skills', label: t('mobile.manage.skills') }, { value: 'packs', label: t('mobile.skills.packs') }]} />
      {error ? <ErrorBox error={error} /> : null}
      {tab === 'skills' ? (
        <>
          <Button title={t('mobile.skills.create')} onPress={newScaffold} />
          {cats.length > 0 ? <Segmented scroll value={category} onChange={setCategory} options={[{ value: '', label: t('mobile.common.all') }, ...cats.map((c) => ({ value: c, label: c }))]} /> : null}
          {skills.loading && !skills.data ? <Loading /> : null}
          {skills.error ? <ErrorBox error={skills.error} onRetry={() => void skills.reload()} /> : null}
          <View style={{ marginHorizontal: -spacing.lg }}>
            {list.map((s) => (
              <ListRow
                key={s.Name}
                title={'/' + s.Name}
                subtitle={[s.Description, s.Category].filter(Boolean).join(' · ')}
                onPress={() => void open(s)}
                trailing={
                  <View style={{ alignItems: 'flex-end', gap: spacing.xs }}>
                    <Switch value={s.Enabled} onValueChange={() => void toggle(s)} accessibilityLabel={t('mobile.skills.enable', { name: s.Name })} trackColor={{ true: p.accent, false: p.line }} />
                    {!s.Valid ? <Badge tone="danger" label={t('mobile.skills.invalid')} /> : null}
                    {s.Mutating ? <Badge tone="warning" label={t('mobile.skills.mutating')} /> : null}
                  </View>
                }
              />
            ))}
          </View>
        </>
      ) : (
        <View style={{ marginHorizontal: -spacing.lg }}>
          {packs.loading && !packs.data ? <Loading /> : null}
          {(packs.data ?? []).map((pk) => (
            <ListRow
              key={pk.Id}
              title={String(pk.Title || pk.Id)}
              subtitle={[pk.Description, pk.Category].filter(Boolean).join(' · ')}
              trailing={<Badge label={String(pk.InstalledCount ?? 0) + ' / ' + String(pk.SkillCount ?? 0)} tone={(pk.InstalledCount as number) > 0 ? 'success' : 'neutral'} />}
              onPress={() => void openPack(pk.Id)}
            />
          ))}
        </View>
      )}
      <Sheet
        visible={editing !== null}
        title={editing?.isNew ? t('mobile.skills.create') : '/' + (editing?.name ?? '')}
        onClose={() => setEditing(null)}
        footer={
          <>
            <Button title={t('common.save')} busy={busy} onPress={() => void save()} />
            {editing && !editing.isNew ? <Button title={t('common.delete')} kind="danger" onPress={() => remove(editing.name)} /> : null}
          </>
        }
      >
        {editing?.isNew ? <Field label={t('mobile.common.name')} value={editing.name} onChangeText={(name) => setEditing({ ...editing, name })} autoCapitalize="none" /> : null}
        {editing && !editing.isNew ? <Field label={t('mobile.skills.category')} hint={t('mobile.skills.categoryHint')} value={editing.category} onChangeText={(category) => setEditing({ ...editing, category })} autoCapitalize="none" /> : null}
        {editing ? <Field label="SKILL.md" multiline value={editing.body} onChangeText={(body) => setEditing({ ...editing, body })} autoCapitalize="none" autoCorrect={false} style={{ minHeight: 280, fontFamily: 'Menlo' }} /> : null}
      </Sheet>
      <Sheet
        visible={scaffold !== null}
        title={t('mobile.skills.create')}
        onClose={() => setScaffold(null)}
        footer={
          <>
            <Button title={t('mobile.skills.createSkill')} busy={busy} onPress={() => void createScaffold()} />
            <Button title={t('mobile.skills.editFirst')} kind="secondary" onPress={editScaffold} />
          </>
        }
      >
        {scaffold ? (
          <>
            <T variant="muted">{t('mobile.skills.scaffoldIntro')}</T>
            <Field
              label={t('mobile.skills.title')}
              hint={t('mobile.skills.titleHint')}
              value={scaffold.title}
              onChangeText={(title) => setScaffold({ ...scaffold, title, id: scaffold.idEdited ? scaffold.id : skillIdFromTitle(title) })}
            />
            <Field
              label={t('mobile.skills.id')}
              hint={t('mobile.skills.idHint')}
              value={scaffold.id}
              placeholder="my-skill"
              onChangeText={(id) => {
                setScaffoldError(null);
                setScaffold({ ...scaffold, id, idEdited: id.length > 0 });
              }}
              autoCapitalize="none"
              autoCorrect={false}
              error={scaffold.id && !isValidSkillId(scaffold.id.trim()) ? t('mobile.skills.idInvalid') : null}
            />
            <Field
              label={t('mobile.skills.description')}
              hint={t('mobile.skills.descriptionHint')}
              value={scaffold.description}
              onChangeText={(description) => setScaffold({ ...scaffold, description })}
              multiline
            />
            <View style={{ gap: spacing.xs }}>
              <T variant="small" style={{ fontWeight: '600', color: p.text }}>
                {t('mobile.skills.interpreter')}
              </T>
              <Segmented
                value={(SKILL_INTERPRETERS as readonly string[]).includes(scaffold.interpreter) ? scaffold.interpreter : ''}
                onChange={(interpreter) => setScaffold({ ...scaffold, interpreter })}
                options={SKILL_INTERPRETERS.map((i) => ({ value: i, label: i }))}
              />
            </View>
            <Field
              label={t('mobile.skills.otherInterpreter')}
              hint={t('mobile.skills.interpreterHint')}
              value={scaffold.interpreter}
              onChangeText={(interpreter) => setScaffold({ ...scaffold, interpreter: interpreter.trim() })}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <ToggleRow label={t('mobile.skills.mutatingLabel')} hint={t('mobile.skills.mutatingHint')} value={scaffold.mutating} onChange={(mutating) => setScaffold({ ...scaffold, mutating })} />
            {scaffoldError ? <Notice tone="danger" text={scaffoldError} /> : null}
          </>
        ) : null}
      </Sheet>
      <Sheet visible={pack !== null} title={String(pack?.Title || pack?.Id || '')} onClose={() => setPack(null)}>
        {pack ? (
          <>
            <T variant="muted">{String(pack.Description ?? '')}</T>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button title={t('mobile.skills.installAll')} busy={busy} onPress={() => void packAction(true)} />
              <Button title={t('mobile.skills.removeAll')} kind="secondary" busy={busy} onPress={() => void packAction(false)} />
            </View>
            <Section title={t('mobile.manage.skills')}>
              <View style={{ marginHorizontal: -spacing.lg }}>
                {(pack.Skills ?? []).map((sk) => (
                  <ListRow
                    key={sk.Id}
                    title={sk.Id}
                    subtitle={sk.Description}
                    trailing={<Button compact kind={sk.Installed ? 'secondary' : 'primary'} title={sk.Installed ? t('mobile.skills.remove') : t('mobile.skills.install')} onPress={() => void packAction(!sk.Installed, sk.Id)} />}
                  />
                ))}
              </View>
            </Section>
          </>
        ) : null}
      </Sheet>
    </Screen>
  );
}
