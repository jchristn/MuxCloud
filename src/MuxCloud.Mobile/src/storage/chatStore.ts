import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Per-device conversation conveniences (AsyncStorage): recent prompts per machine for the history picker, and when
 * each conversation was last opened here, for unread dots. Every read tolerates missing or corrupt values.
 */
const HISTORY = 'muxcloud.promptHistory.';
const SEEN = 'muxcloud.seen.';
const BASELINE = 'muxcloud.seenBaseline';
const MAX_HISTORY = 50;

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const text = await AsyncStorage.getItem(key);
    return text ? (JSON.parse(text) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // A convenience only; never block the conversation.
  }
}

/** Recent prompts sent to a machine, newest first. */
export function loadPromptHistory(machineId: string): Promise<string[]> {
  return readJson<string[]>(HISTORY + machineId, []);
}

/** Remember a prompt (moved to the front if it was already there). */
export async function rememberPrompt(machineId: string, prompt: string): Promise<void> {
  const text = prompt.trim();
  if (!text) return;
  const list = await loadPromptHistory(machineId);
  await writeJson(HISTORY + machineId, [text, ...list.filter((p) => p !== text)].slice(0, MAX_HISTORY));
}

/** When each conversation on a machine was last opened on this device (epoch ms). */
export function loadSeen(machineId: string): Promise<Record<string, number>> {
  return readJson<Record<string, number>>(SEEN + machineId, {});
}

/** Mark a conversation as read now. */
export async function markSeen(machineId: string, sessionId: string): Promise<void> {
  const seen = await loadSeen(machineId);
  seen[sessionId] = Date.now();
  await writeJson(SEEN + machineId, seen);
}

/** The time unread tracking started on this device; conversations changed before it are not unread. */
export async function seenBaseline(): Promise<number> {
  const existing = await readJson<number>(BASELINE, 0);
  if (existing > 0) return existing;
  const now = Date.now();
  await writeJson(BASELINE, now);
  return now;
}
