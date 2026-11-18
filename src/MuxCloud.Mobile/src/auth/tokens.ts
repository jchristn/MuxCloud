import { readSecret, secureKey, writeSecret } from '@/storage/secure';

/** Tokens returned by `POST /v1.0/api/auth/login` with `client: "mobile"` and by `/auth/refresh`. */
export interface TokenSet {
  accessToken: string;
  accessTokenExpiresUtc?: string;
  refreshToken: string;
  refreshTokenExpiresUtc?: string;
  sessionId?: string;
}

/** Where tokens persist. The app uses the secure store; tests use memory. */
export interface TokenStorage {
  load(serverUrl: string): Promise<TokenSet | null>;
  save(serverUrl: string, tokens: TokenSet | null): Promise<void>;
}

export const secureTokenStorage: TokenStorage = {
  async load(serverUrl) {
    const text = await readSecret(secureKey('muxcloud.tokens', serverUrl));
    if (!text) return null;
    try {
      const parsed = JSON.parse(text) as TokenSet;
      return parsed.accessToken && parsed.refreshToken ? parsed : null;
    } catch {
      return null;
    }
  },
  async save(serverUrl, tokens) {
    await writeSecret(secureKey('muxcloud.tokens', serverUrl), tokens ? JSON.stringify(tokens) : null);
  },
};

export function memoryTokenStorage(): TokenStorage {
  const map = new Map<string, TokenSet>();
  return {
    async load(serverUrl) {
      return map.get(serverUrl) ?? null;
    },
    async save(serverUrl, tokens) {
      if (tokens) map.set(serverUrl, tokens);
      else map.delete(serverUrl);
    },
  };
}
