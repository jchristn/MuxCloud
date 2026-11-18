import AsyncStorage from '@react-native-async-storage/async-storage';

/** Non-secret preferences (AsyncStorage). Every read tolerates missing or corrupt values. */
export interface Prefs {
  serverUrl: string;
  theme: 'system' | 'light' | 'dark';
  locale: string | null;
  biometricLock: boolean;
  lastEmail: string;
  pushDeviceId: string | null;
}

export const DEFAULT_SERVER_URL = 'https://app.usemux.ai';

export const DEFAULT_PREFS: Prefs = {
  serverUrl: DEFAULT_SERVER_URL,
  theme: 'system',
  locale: null,
  biometricLock: false,
  lastEmail: '',
  pushDeviceId: null,
};

const KEY = 'muxcloud.prefs';

export async function loadPrefs(): Promise<Prefs> {
  try {
    const text = await AsyncStorage.getItem(KEY);
    if (!text) return { ...DEFAULT_PREFS };
    const parsed = JSON.parse(text) as Partial<Prefs>;
    return { ...DEFAULT_PREFS, ...parsed, serverUrl: normalizeServerUrl(parsed.serverUrl ?? DEFAULT_SERVER_URL) };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export async function savePrefs(prefs: Prefs): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // Preferences are a convenience; failing to save one never blocks the app.
  }
}

/** Trim, default the scheme to https, and drop trailing slashes. Returns '' for input that is not a URL. */
export function normalizeServerUrl(input: string): string {
  let value = (input ?? '').trim();
  if (!value) return '';
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) value = 'https://' + value;
  if (!/^https?:\/\/[^/\s]+/i.test(value)) return '';
  return value.replace(/\/+$/, '');
}

/** True for plain-HTTP servers, which the UI warns about. */
export function isInsecureServer(url: string): boolean {
  return /^http:\/\//i.test(url);
}
