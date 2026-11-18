import { ApiError, ClientErrorCodes } from './ApiError';
import { buildQuery } from './query';

/**
 * How the client authenticates.
 * - `cookie`: the browser dashboard. The HttpOnly `muxcloud_session` cookie travels automatically
 *   (`credentials: 'include'`); refresh posts to `/v1.0/api/auth/refresh` with the `muxcloud_refresh` cookie.
 * - `bearer`: the mobile app and scripts. `getAccessToken` supplies the token and `refreshTokens` renews it.
 */
export type AuthMode = 'cookie' | 'bearer';

export interface ApiClientOptions {
  /** Server origin, for example `https://app.usemux.ai`. Empty means same origin (the browser dashboard). */
  baseUrl?: string;
  authMode?: AuthMode;
  /** Bearer mode: current access token, or null when signed out. */
  getAccessToken?: () => string | null | Promise<string | null>;
  /** Bearer mode: renew tokens after a 401. Return true when a new access token is available. */
  refreshTokens?: () => Promise<boolean>;
  /** Called once when a request is still unauthorized after a refresh attempt. */
  onUnauthorized?: () => void;
  /** Value for `Accept-Language`, for example the active UI locale. */
  getLocale?: () => string | null;
  /** Extra headers on every request. */
  headers?: Record<string, string>;
  /** fetch implementation. Defaults to the global fetch. */
  fetchImpl?: typeof fetch;
}

export interface RequestOptions {
  method?: string;
  query?: object;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /** Skip the refresh-and-retry step (used by the auth routes themselves). */
  skipRefresh?: boolean;
  /** Return null instead of throwing on 404. */
  allowNotFound?: boolean;
}

/** Result of a raw request (API Explorer). */
export interface RawResult {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  bodyText: string;
  durationMs: number;
  bytes: number;
  url: string;
}

const NO_REFRESH_PATHS = ['/v1.0/api/auth/login', '/v1.0/api/auth/refresh', '/v1.0/api/auth/signup', '/v1.0/api/auth/logout'];

/**
 * Typed fetch wrapper for the Mux Cloud API. Host agnostic: no window, document, or storage access, so the
 * mobile app shares it. Errors are always ApiError.
 */
export class ApiClient {
  private options: ApiClientOptions;
  private refreshing: Promise<boolean> | null = null;

  constructor(options: ApiClientOptions = {}) {
    this.options = { authMode: 'cookie', baseUrl: '', ...options };
  }

  /** Change options after construction (for example after sign-in on mobile). */
  configure(options: Partial<ApiClientOptions>): void {
    this.options = { ...this.options, ...options };
  }

  get baseUrl(): string {
    return (this.options.baseUrl ?? '').replace(/\/+$/, '');
  }

  get authMode(): AuthMode {
    return this.options.authMode ?? 'cookie';
  }

  /** Absolute or same-origin URL for a path. */
  url(path: string, query?: object): string {
    return this.baseUrl + path + buildQuery(query);
  }

  /** WebSocket URL for a path. `pageOrigin` is used when the client is same-origin (browser). */
  wsUrl(path: string, query?: object, pageOrigin?: string): string {
    const origin = this.baseUrl || pageOrigin || '';
    const wsOrigin = origin.replace(/^http:/i, 'ws:').replace(/^https:/i, 'wss:');
    return wsOrigin + path + buildQuery(query);
  }

  async get<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  async post<T>(path: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: 'POST', body });
  }

  async put<T>(path: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: 'PUT', body });
  }

  async delete<T>(path: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: 'DELETE', body });
  }

  /** Send a request and parse JSON. 204 and empty bodies resolve to null. */
  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const response = await this.send(path, options);
    if (response.status === 404 && options.allowNotFound) return null as T;
    if (!response.ok) throw await this.toError(response);
    if (response.status === 204) return null as T;
    const text = await response.text();
    if (!text) return null as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new ApiError(response.status, ClientErrorCodes.InvalidJson, 'The server returned a response that is not JSON.');
    }
  }

  /** Send a request and return the raw Response (streaming, relay). Throws ApiError only on network failure. */
  async send(path: string, options: RequestOptions = {}): Promise<Response> {
    let response = await this.fetchOnce(path, options);
    if (response.status === 401 && !options.skipRefresh && !NO_REFRESH_PATHS.includes(path)) {
      const refreshed = await this.tryRefresh();
      if (refreshed) response = await this.fetchOnce(path, options);
      if (response.status === 401) this.options.onUnauthorized?.();
    }
    return response;
  }

  /** Raw request for the API Explorer: never throws on HTTP status, always reports timing. */
  async raw(method: string, pathAndQuery: string, body: string | null, headers: Record<string, string>, signal?: AbortSignal): Promise<RawResult> {
    const started = Date.now();
    const init: RequestInit = { method, headers: await this.headersFor(headers, body !== null), signal, credentials: 'include' };
    if (body !== null && method !== 'GET' && method !== 'HEAD') init.body = body;
    const url = this.baseUrl + pathAndQuery;
    let response: Response;
    try {
      response = await this.fetchImpl()(url, init);
    } catch (error) {
      throw this.networkError(error);
    }
    const bodyText = await response.text();
    const result: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      result[key] = value;
    });
    return {
      status: response.status,
      statusText: response.statusText,
      headers: result,
      bodyText,
      durationMs: Date.now() - started,
      bytes: new TextEncoder().encode(bodyText).length,
      url,
    };
  }

  private fetchImpl(): typeof fetch {
    return this.options.fetchImpl ?? ((input, init) => fetch(input, init));
  }

  private async headersFor(extra: Record<string, string> | undefined, hasBody: boolean): Promise<Record<string, string>> {
    const headers: Record<string, string> = { Accept: 'application/json', ...(this.options.headers ?? {}) };
    if (hasBody) headers['Content-Type'] = 'application/json';
    const locale = this.options.getLocale?.();
    if (locale) headers['Accept-Language'] = locale;
    if (this.authMode === 'bearer') {
      const token = await this.options.getAccessToken?.();
      if (token) headers['Authorization'] = 'Bearer ' + token;
    }
    return { ...headers, ...(extra ?? {}) };
  }

  private async fetchOnce(path: string, options: RequestOptions): Promise<Response> {
    const hasBody = options.body !== undefined && options.body !== null;
    const init: RequestInit = {
      method: options.method ?? 'GET',
      headers: await this.headersFor(options.headers, hasBody),
      signal: options.signal,
      credentials: this.authMode === 'cookie' ? 'include' : 'omit',
    };
    if (hasBody) init.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
    try {
      return await this.fetchImpl()(this.url(path, options.query), init);
    } catch (error) {
      throw this.networkError(error);
    }
  }

  private networkError(error: unknown): ApiError {
    const name = (error as { name?: string } | null)?.name;
    if (name === 'AbortError') return new ApiError(0, ClientErrorCodes.Aborted, 'The request was canceled.');
    return new ApiError(0, ClientErrorCodes.Network, 'Could not reach Mux Cloud. Check your connection.');
  }

  private async tryRefresh(): Promise<boolean> {
    if (!this.refreshing) {
      this.refreshing = this.doRefresh().finally(() => {
        this.refreshing = null;
      });
    }
    return this.refreshing;
  }

  private async doRefresh(): Promise<boolean> {
    if (this.authMode === 'bearer') {
      return this.options.refreshTokens ? this.options.refreshTokens() : false;
    }
    try {
      const response = await this.fetchOnce('/v1.0/api/auth/refresh', { method: 'POST', body: {} });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async toError(response: Response): Promise<ApiError> {
    let code = 'HttpError' + response.status;
    let message = response.statusText;
    let body: unknown = null;
    try {
      const text = await response.text();
      if (text) {
        body = JSON.parse(text);
        const parsed = body as { error?: unknown; message?: unknown };
        if (typeof parsed.error === 'string') code = parsed.error;
        if (typeof parsed.message === 'string') message = parsed.message;
      }
    } catch {
      // Body is not JSON; keep the status-derived code.
    }
    const retry = response.headers.get('Retry-After');
    const retryAfter = retry && /^\d+$/.test(retry) ? Number(retry) : null;
    return new ApiError(response.status, code, message, retryAfter, body);
  }
}
