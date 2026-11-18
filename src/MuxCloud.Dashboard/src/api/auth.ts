import type { ApiClient } from './client';
import type {
  AcceptedResponse,
  LoginRequest,
  LoginResponse,
  MeResponse,
  ResetResponse,
  SignupRequest,
  SignupResponse,
  VerifyResponse,
} from '../types';

const base = '/v1.0/api/auth';

/** Auth routes (REST_API.md "Auth"). */
export const authApi = {
  signup: (c: ApiClient, request: SignupRequest) => c.post<SignupResponse>(base + '/signup', request, { skipRefresh: true }),
  verify: (c: ApiClient, token: string) => c.post<VerifyResponse>(base + '/verify', { token }, { skipRefresh: true }),
  resendVerification: (c: ApiClient, email: string) =>
    c.post<AcceptedResponse>(base + '/verify/resend', { email }, { skipRefresh: true }),
  login: (c: ApiClient, request: LoginRequest) => c.post<LoginResponse>(base + '/login', request, { skipRefresh: true }),
  /** Cookie mode: pass no token. Bearer mode: pass the refresh token. */
  refresh: (c: ApiClient, refreshToken?: string) =>
    c.post<LoginResponse>(base + '/refresh', refreshToken ? { refreshToken } : {}, { skipRefresh: true }),
  logout: (c: ApiClient) => c.post<null>(base + '/logout', {}, { skipRefresh: true }),
  forgotPassword: (c: ApiClient, email: string) =>
    c.post<AcceptedResponse>(base + '/password/forgot', { email }, { skipRefresh: true }),
  resetPassword: (c: ApiClient, token: string, password: string) =>
    c.post<ResetResponse>(base + '/password/reset', { token, password }, { skipRefresh: true }),
  me: (c: ApiClient) => c.get<MeResponse>(base + '/me'),
};
