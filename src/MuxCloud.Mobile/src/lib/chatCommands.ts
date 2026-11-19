/**
 * Pure helpers for the conversation composer: `#` quick memories, slash-command autocomplete, `@file` mentions, and the
 * argument parsing of `/memory`, `/label`, `/tag`, and `/effort` (exported for tests). Behavior follows the mux desktop
 * app so the same input does the same thing on every surface.
 */

/** Longest memory slug mux writes (MemoryStore.MaxSlugLength). */
const MAX_SLUG = 60;

/** mux's memory slug: lowercase letters and digits joined by single hyphens, at most 60 characters. */
export function slugify(name: string | null | undefined): string {
  let out = '';
  let hyphen = false;
  for (const c of (name ?? '').trim().toLowerCase()) {
    if ((c >= 'a' && c <= 'z') || (c >= '0' && c <= '9')) {
      if (hyphen && out.length > 0) out += '-';
      out += c;
      hyphen = false;
    } else {
      hyphen = true;
    }
    if (out.length >= MAX_SLUG) break;
  }
  return out.replace(/^-+|-+$/g, '');
}

/** The memory name mux derives from a line of text: the slug of its first six words that have letters or digits. */
export function memoryNameFromText(text: string): string {
  const kept: string[] = [];
  for (const word of (text ?? '').split(/\s+/).filter(Boolean)) {
    if (!slugify(word)) continue;
    kept.push(word);
    if (kept.length === 6) break;
  }
  return slugify(kept.join(' '));
}

/** `# text` saves a project memory and `#global text` a global one (mux MemoryQuickAdd); `##` is ordinary text. */
export function parseQuickMemory(input: string): { scope: 'project' | 'global'; text: string } | null {
  const trimmed = (input ?? '').trim();
  if (!trimmed.startsWith('#') || trimmed.startsWith('##')) return null;
  let rest = trimmed.slice(1).trim();
  let scope: 'project' | 'global' = 'project';
  if (rest.length > 7 && rest.slice(0, 6).toLowerCase() === 'global' && /\s/.test(rest[6])) {
    scope = 'global';
    rest = rest.slice(7).trim();
  }
  if (!memoryNameFromText(rest)) return null;
  return { scope, text: rest };
}

/** Built-in chat commands, in the order the help card lists them. `screen` commands open a management screen. */
export const CHAT_COMMANDS: { command: string; args?: string }[] = [
  { command: 'help' },
  { command: 'new' },
  { command: 'stats' },
  { command: 'context' },
  { command: 'cwd', args: '[folder]' },
  { command: 'instructions' },
  { command: 'memory', args: '[show|delete <name>|clear]' },
  { command: 'worktrees' },
  { command: 'undo' },
  { command: 'redo' },
  { command: 'label', args: '[a, b]' },
  { command: 'tag', args: '[key=value]' },
  { command: 'effort', args: '[level]' },
  { command: 'endpoint', args: '[name]' },
  { command: 'history' },
  { command: 'usage' },
  { command: 'endpoints' },
  { command: 'mcp' },
  { command: 'prompts' },
  { command: 'skills' },
  { command: 'subagents' },
  { command: 'hooks' },
  { command: 'commands' },
  { command: 'keybindings' },
  { command: 'pricing' },
  { command: 'settings' },
];

/** Every command the composer understands, including aliases (for autocomplete and parsing). */
export const COMMAND_ALIASES: Record<string, string> = {
  '?': 'help',
  clear: 'new',
  model: 'endpoints',
  models: 'endpoints',
  keys: 'keybindings',
  shortcuts: 'keybindings',
  agents: 'subagents',
  subagent: 'subagents',
  skill: 'skills',
  mcps: 'mcp',
  prompt: 'prompts',
  plugin: 'hooks',
  plugins: 'hooks',
};

/** Resolve an alias to its command (`/keys` is `/keybindings`). */
export function canonicalCommand(command: string): string {
  const c = (command ?? '').toLowerCase();
  return COMMAND_ALIASES[c] ?? c;
}

/** mux reasoning-effort levels; `off` clears the endpoint's setting. */
export const EFFORT_LEVELS = ['off', 'none', 'minimal', 'low', 'medium', 'high', 'xhigh'] as const;

const MEMORY_ACTIONS = ['show', 'delete', 'clear'];

export interface Suggestion {
  /** Text shown in the suggestion chip. */
  label: string;
  /** The composer text after picking it. */
  insert: string;
}

/**
 * Autocomplete for the composer: command names after `/`, then endpoint names after `/endpoint `, effort levels after
 * `/effort `, memory actions after `/memory `, and skill names. At most `limit` suggestions, best match first.
 */
export function slashSuggestions(input: string, extra: { endpoints?: string[]; skills?: string[] } = {}, limit = 8): Suggestion[] {
  if (!input.startsWith('/')) return [];
  const space = input.indexOf(' ');
  if (space < 0) {
    const prefix = input.slice(1).toLowerCase();
    const names = [...CHAT_COMMANDS.map((c) => c.command), ...Object.keys(COMMAND_ALIASES).filter((a) => a !== '?'), ...(extra.skills ?? [])];
    const seen = new Set<string>();
    const out: Suggestion[] = [];
    for (const name of names) {
      const key = name.toLowerCase();
      if (seen.has(key) || !key.startsWith(prefix) || key === prefix) continue;
      seen.add(key);
      out.push({ label: '/' + name, insert: '/' + name + ' ' });
      if (out.length >= limit) break;
    }
    return out;
  }
  const command = canonicalCommand(input.slice(1, space));
  const arg = input.slice(space + 1).toLowerCase();
  if (arg.includes(' ')) return [];
  const head = input.slice(0, space + 1);
  const pick = (values: string[]) =>
    values
      .filter((v) => v.toLowerCase().startsWith(arg) && v.toLowerCase() !== arg)
      .slice(0, limit)
      .map((v) => ({ label: v, insert: head + v }));
  if (command === 'endpoint') return pick(extra.endpoints ?? []);
  if (command === 'effort') return pick([...EFFORT_LEVELS]);
  if (command === 'memory') return pick(MEMORY_ACTIONS);
  return [];
}

/** `/memory`, `/memory show <name>`, `/memory delete <name>`, `/memory clear [global]`. Anything else lists. */
export function parseMemoryCommand(args: string): { action: 'list' | 'show' | 'delete' | 'clear'; name?: string; scope?: 'project' | 'global' } {
  const [verb, ...rest] = (args ?? '').trim().split(/\s+/).filter(Boolean);
  const name = rest.join(' ').trim();
  const v = (verb ?? '').toLowerCase();
  if ((v === 'show' || v === 'delete' || v === 'rm' || v === 'remove') && name) return { action: v === 'show' ? 'show' : 'delete', name };
  if (v === 'clear') return { action: 'clear', scope: /\bglobal\b/i.test(name) ? 'global' : 'project' };
  return { action: 'list' };
}

/** `/label a, b` or `/label a b`: labels to add, trimmed and de-duplicated. */
export function parseLabels(args: string): string[] {
  const parts = (args ?? '')
    .split(args.includes(',') ? ',' : /\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return [...new Set(parts)];
}

/** `/tag key=value, k2:v2`: tags to set. Pairs without a key are skipped. */
export function parseTags(args: string): { Key: string; Value: string }[] {
  const out: { Key: string; Value: string }[] = [];
  for (const part of (args ?? '').split(',')) {
    const text = part.trim();
    if (!text) continue;
    const at = text.search(/[=:]/);
    const key = (at < 0 ? text : text.slice(0, at)).trim();
    const value = at < 0 ? '' : text.slice(at + 1).trim();
    if (key) out.push({ Key: key, Value: value });
  }
  return out;
}

/** The `@mention` being typed at the end of the composer (text after the last `@`), or null. */
export function mentionAtEnd(input: string): string | null {
  const match = /(?:^|\s)@([^\s@]*)$/.exec(input ?? '');
  return match ? match[1] : null;
}

/** Replace the `@mention` being typed at the end with a completed one; directories keep the cursor in the path. */
export function applyMention(input: string, mention: string): string {
  const at = input.lastIndexOf('@');
  if (at < 0) return input;
  const completed = mention.startsWith('@') ? mention : '@' + mention;
  return input.slice(0, at) + completed + (completed.endsWith('/') ? '' : ' ');
}
