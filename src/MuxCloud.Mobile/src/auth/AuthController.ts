import { ApiClient, ApiError, authApi, ticketsApi } from '@dashboard/api';
import type { LoginResponse, User } from '@dashboard/types';
import type { TokenSet, TokenStorage } from './tokens';

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

export interface AuthState {
  status: AuthStatus;
  serverUrl: string;
  user: User | null;
}

export interface AuthControllerOptions {
  serverUrl: string;
  storage: TokenStorage;
  /** Label for this device in the account's session list. */
  deviceName?: string;
  getLocale?: () => string | null;
  fetchImpl?: typeof fetch;
  /** Clock, injectable for tests. */
  now?: () => number;
}

/** Refresh this long before the access token's stated expiry, so requests rarely meet a 401. */
const EARLY_REFRESH_MS = 30_000;

/**
 * Bearer-mode authentication for the mobile app (REST_API.md "Authentication"): signs in with `client: "mobile"`,
 * keeps the access and refresh tokens in secure storage per server, refreshes before expiry and after a 401 (one
 * refresh in flight at a time, because refresh tokens rotate and a reused one revokes the session), and signs out when
 * the session is gone. Host agnostic apart from the injected storage, so it is unit tested in Node.
 */
export class AuthController {
  readonly client: ApiClient;
  private options: AuthControllerOptions;
  private tokens: TokenSet | null = null;
  private state: AuthState;
  private listeners = new Set<(state: AuthState) => void>();
  private refreshing: Promise<boolean> | null = null;
  /** True while the refresh request itself is being sent: it must not wait on (or start) another refresh. */
  private inRefresh = false;

  constructor(options: AuthControllerOptions) {
    this.options = options;
    this.state = { status: 'loading', serverUrl: options.serverUrl, user: null };
    this.client = new ApiClient({
      baseUrl: options.serverUrl,
      authMode: 'bearer',
      getAccessToken: () => this.getAccessToken(),
      refreshTokens: () => this.refresh(),
      onUnauthorized: () => {
        void this.clearSession();
      },
      getLocale: options.getLocale,
      fetchImpl: options.fetchImpl,
    });
  }

  getState(): AuthState {
    return this.state;
  }

  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Load saved tokens and confirm the session with `GET /auth/me`. */
  async restore(): Promise<AuthState> {
    this.tokens = await this.options.storage.load(this.options.serverUrl);
    if (!this.tokens) return this.setState({ status: 'signedOut', user: null });
    try {
      const me = await authApi.me(this.client);
      return this.setState({ status: 'signedIn', user: me.user });
    } catch (error) {
      if (error instanceof ApiError && error.status === 0) {
        // Offline: keep the saved session; screens show the network error and retry.
        return this.setState({ status: 'signedIn', user: this.state.user });
      }
      await this.clearSession();
      return this.state;
    }
  }

  async signIn(email: string, password: string): Promise<User> {
    const response = await authApi.login(this.client, {
      email: email.trim(),
      password,
      client: 'mobile',
      deviceName: this.options.deviceName,
    });
    await this.adopt(response);
    this.setState({ status: 'signedIn', user: response.user });
    return response.user;
  }

  /** Revoke the session on the server (best effort) and forget the tokens. */
  async signOut(): Promise<void> {
    if (this.tokens) {
      try {
        await authApi.logout(this.client);
      } catch {
        // Signing out locally always succeeds; the server session expires on its own.
      }
    }
    await this.clearSession();
  }

  /** Replace the cached user after a profile change. */
  setUser(user: User): void {
    if (this.state.status === 'signedIn') this.setState({ status: 'signedIn', user });
  }

  /** The access token, refreshed first when it is about to expire. */
  async getAccessToken(): Promise<string | null> {
    if (!this.tokens) return null;
    if (this.inRefresh) return this.tokens.accessToken;
    const expires = this.tokens.accessTokenExpiresUtc ? Date.parse(this.tokens.accessTokenExpiresUtc) : NaN;
    const now = (this.options.now ?? Date.now)();
    if (!Number.isNaN(expires) && expires - EARLY_REFRESH_MS <= now) {
      await this.refresh();
    }
    return this.tokens?.accessToken ?? null;
  }

  /** Rotate the tokens. Concurrent callers share one request. Resolves false when the session is gone. */
  refresh(): Promise<boolean> {
    if (!this.refreshing) {
      this.refreshing = this.doRefresh().finally(() => {
        this.refreshing = null;
      });
    }
    return this.refreshing;
  }

  /** A single-use WebSocket ticket (`POST /v1.0/api/ws-tickets`). */
  async wsTicket(): Promise<string> {
    const ticket = await ticketsApi.create(this.client);
    return ticket.ticket;
  }

  private async doRefresh(): Promise<boolean> {
    const refreshToken = this.tokens?.refreshToken;
    if (!refreshToken) return false;
    try {
      this.inRefresh = true;
      let response: LoginResponse;
      try {
        response = await authApi.refresh(this.client, refreshToken);
      } finally {
        this.inRefresh = false;
      }
      await this.adopt(response);
      if (this.state.status !== 'signedIn' || response.user) {
        this.setState({ status: 'signedIn', user: response.user ?? this.state.user });
      }
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 0) return false;
      await this.clearSession();
      return false;
    }
  }

  private async adopt(response: LoginResponse): Promise<void> {
    if (!response.accessToken || !response.refreshToken) {
      throw new ApiError(500, 'MissingTokens', 'The server did not return mobile tokens. Is it a Mux Cloud server?');
    }
    this.tokens = {
      accessToken: response.accessToken,
      accessTokenExpiresUtc: response.accessTokenExpiresUtc,
      refreshToken: response.refreshToken,
      refreshTokenExpiresUtc: response.refreshTokenExpiresUtc,
      sessionId: response.sessionId,
    };
    await this.options.storage.save(this.options.serverUrl, this.tokens);
  }

  private async clearSession(): Promise<void> {
    this.tokens = null;
    await this.options.storage.save(this.options.serverUrl, null);
    this.setState({ status: 'signedOut', user: null });
  }

  private setState(partial: Omit<AuthState, 'serverUrl'>): AuthState {
    this.state = { ...partial, serverUrl: this.options.serverUrl };
    for (const listener of this.listeners) listener(this.state);
    return this.state;
  }
}
