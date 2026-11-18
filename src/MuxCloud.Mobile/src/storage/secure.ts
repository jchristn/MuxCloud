import * as SecureStore from 'expo-secure-store';

/**
 * Secrets (access and refresh tokens) live in the iOS Keychain / Android Keystore, readable after the first unlock and
 * never migrated to another device by backup.
 */
const OPTIONS: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY };

/** Secure-store keys allow only [A-Za-z0-9._-]; server URLs are folded into that alphabet. */
export function secureKey(prefix: string, scope: string): string {
  return prefix + '.' + scope.toLowerCase().replace(/[^a-z0-9._-]/g, '_');
}

export async function readSecret(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key, OPTIONS);
  } catch {
    return null;
  }
}

export async function writeSecret(key: string, value: string | null): Promise<void> {
  if (value === null) {
    await SecureStore.deleteItemAsync(key, OPTIONS);
    return;
  }
  await SecureStore.setItemAsync(key, value, OPTIONS);
}
