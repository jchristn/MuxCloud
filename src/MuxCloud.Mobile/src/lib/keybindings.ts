import type { MuxKeybindingCommand } from '@/types/mux';

export interface KeybindingOverride {
  CommandId: string;
  Chord?: string | null;
}

/**
 * The full override list to PUT after changing one command. `PUT /keybindings` replaces every override, so the stored
 * ones are kept. A blank chord unbinds; the default chord resets (mux drops an override equal to the default, and so
 * does this, so the list stays minimal).
 */
export function overridesAfter(
  current: KeybindingOverride[],
  commandId: string,
  chord: string,
  defaultChord?: string | null,
): { CommandId: string; Chord: string }[] {
  const map = new Map(current.map((o) => [o.CommandId, o.Chord ?? '']));
  const next = normalizeChord(chord);
  if (next === normalizeChord(defaultChord ?? '')) map.delete(commandId);
  else map.set(commandId, next);
  return [...map].map(([CommandId, Chord]) => ({ CommandId, Chord }));
}

/** Lowercases and trims a chord and the parts around `+`: " Ctrl + K " becomes "ctrl+k". */
export function normalizeChord(chord: string): string {
  return chord
    .split('+')
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean)
    .join('+');
}

/** Commands grouped by category in first-seen order, filtered by a search over title, id, and chords. */
export function groupCommands(items: MuxKeybindingCommand[], query: string): { category: string; items: MuxKeybindingCommand[] }[] {
  const q = query.trim().toLowerCase();
  const groups = new Map<string, MuxKeybindingCommand[]>();
  for (const c of items) {
    const hay = [c.Title, c.CommandId, c.EffectiveChord ?? '', c.DefaultChord ?? ''].join(' ').toLowerCase();
    if (q && !hay.includes(q)) continue;
    const key = c.Category || '';
    groups.set(key, [...(groups.get(key) ?? []), c]);
  }
  return [...groups].map(([category, list]) => ({ category, items: list }));
}
