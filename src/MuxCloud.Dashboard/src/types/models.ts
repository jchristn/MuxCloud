/**
 * Mux Cloud REST DTOs (REST_API.md). Shared with the mobile app: types only, no runtime code.
 */

/** A page of results from a paged list route (REST_API.md "Conventions"). */
export interface Page<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
}

/** Paging inputs accepted by every list route. */
export interface PageQuery {
  pageNumber?: number;
  pageSize?: number;
}

/** The error body every failed request returns. */
export interface ApiErrorBody {
  error: string;
  message?: string;
}

export interface HealthResponse {
  status: string;
  product: string;
  version: string;
  utc: string;
}

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  emailVerified: boolean;
  isAdmin: boolean;
  active?: boolean;
  tenantId: string;
  accountId: string;
  createdUtc: string;
  lastLoginUtc?: string;
}

export interface EntitlementFeature {
  key: string;
  enabled: boolean;
  limit: number | null;
}

export interface Entitlements {
  accountId: string;
  planCode: string;
  features: EntitlementFeature[];
}

export interface SignupRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  acceptTerms: boolean;
}

export interface SignupResponse {
  userId: string;
  email: string;
  status: string;
}

export type ClientKind = 'web' | 'mobile';

export interface LoginRequest {
  email: string;
  password: string;
  client?: ClientKind;
  deviceName?: string;
}

export interface LoginResponse {
  sessionId: string;
  user: User;
  accessToken?: string;
  accessTokenExpiresUtc?: string;
  refreshToken?: string;
  refreshTokenExpiresUtc?: string;
}

export interface MeResponse {
  user: User;
  sessionId: string;
  entitlements: Entitlements;
}

export interface VerifyResponse {
  verified: boolean;
  email: string;
}

export interface AcceptedResponse {
  accepted: boolean;
}

export interface ResetResponse {
  reset: boolean;
}

export interface AccountUpdateRequest {
  firstName?: string;
  lastName?: string;
}

export interface PasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
}

export interface AuthSession {
  id: string;
  client: ClientKind | string;
  deviceName?: string;
  sourceIp?: string;
  userAgent?: string;
  createdUtc: string;
  lastUsedUtc?: string;
  expiresUtc?: string;
  current: boolean;
}

export interface Machine {
  id: string;
  name: string;
  hostname?: string;
  os?: string;
  muxVersion?: string;
  protocolVersion?: number;
  online: boolean;
  lastSeenUtc?: string;
  lastConnectedUtc?: string;
  lastDisconnectedUtc?: string;
  activeRuns: number;
  awaitingApproval: number;
  remoteToolApproval: boolean;
  secretLast4?: string;
  revoked: boolean;
  createdUtc: string;
  userId?: string;
}

export interface MachineQuery extends PageQuery {
  online?: boolean;
  name?: string;
  includeRevoked?: boolean;
}

export interface MachineConnection {
  id: string;
  machineId: string;
  nodeId?: string;
  remoteIp?: string;
  protocolVersion?: number;
  muxVersion?: string;
  connectedUtc: string;
  disconnectedUtc?: string;
  closeCode?: number;
  closeReason?: string;
  bytesIn?: number;
  bytesOut?: number;
}

export interface PlanFeature {
  key: string;
  limit: number | null;
}

export interface Plan {
  id: string;
  code: string;
  name: string;
  priceCents: number;
  currency: string;
  interval: string;
  active?: boolean;
  public?: boolean;
  features: PlanFeature[];
}

export interface PlanRequest {
  code: string;
  name: string;
  priceCents: number;
  currency: string;
  interval: string;
  active: boolean;
  public: boolean;
  features: PlanFeature[];
}

export type SubscriptionStatus = 'Trialing' | 'Active' | 'PastDue' | 'Canceled' | 'Expired';

export interface Subscription {
  id: string;
  planId: string;
  planCode: string;
  status: SubscriptionStatus;
  provider: string;
  currentPeriodEndUtc: string | null;
  cancelAtPeriodEnd: boolean;
  createdUtc: string;
}

export interface UrlResponse {
  url: string;
}

export interface WsTicket {
  ticket: string;
  expiresUtc: string;
}

export interface AdminStats {
  users: number;
  machines: number;
  onlineMachines: number;
  liveConnections: number;
  relayStreams: number;
  eventSubscribers: number;
}

export interface AdminUserQuery extends PageQuery {
  email?: string;
}

export interface AdminUserUpdate {
  active?: boolean;
  isAdmin?: boolean;
  emailVerified?: boolean;
  firstName?: string;
  lastName?: string;
}

export interface AdminMachineQuery extends PageQuery {
  online?: boolean;
  name?: string;
  userId?: string;
}

export interface EntitlementOverride {
  id: string;
  accountId: string;
  featureKey: string;
  limit: number | null;
  reason?: string;
  expiresUtc: string | null;
  createdUtc?: string;
}

export interface EntitlementOverrideRequest {
  featureKey: string;
  limit: number | null;
  reason?: string;
  expiresUtc: string | null;
}

export interface AuditRecord {
  id: string;
  eventType: string;
  result?: string;
  reason?: string;
  userId?: string;
  tenantId?: string;
  accountId?: string;
  principal?: string;
  resourceType?: string;
  resourceId?: string;
  sourceIp?: string;
  requestId?: string;
  detail?: string;
  createdUtc: string;
}

export interface AuditQuery extends PageQuery {
  eventType?: string;
  userId?: string;
  fromUtc?: string;
  toUtc?: string;
}

/** Effective server settings (admin). Secrets are shown as "(set)" or "(not set)". Read only in 0.1.0. */
export interface AdminSettings {
  environmentOverrides?: string[];
  [section: string]: unknown;
}

export interface RequestHistoryEntry {
  id: string;
  method: string;
  path: string;
  pathTemplate?: string;
  statusCode: number;
  durationMs: number;
  requestBytes?: number;
  responseBytes?: number;
  userId?: string;
  tenantId?: string;
  sourceIp?: string;
  isRelay?: boolean;
  createdUtc: string;
  completedUtc?: string;
}

export interface RequestHistoryDetail extends RequestHistoryEntry {
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  requestBody?: string;
  responseBody?: string;
  requestBodyTruncated?: boolean;
  responseBodyTruncated?: boolean;
}

export interface RequestHistoryQuery extends PageQuery {
  method?: string;
  statusCode?: number;
  pathContains?: string;
  fromUtc?: string;
  toUtc?: string;
  userId?: string;
}

export interface RequestHistoryBucket {
  bucketStartUtc: string;
  bucketEndUtc: string;
  successCount: number;
  failureCount: number;
  averageDurationMs: number;
}

export interface RequestHistorySummary {
  totalCount: number;
  totalSuccess: number;
  totalFailure: number;
  averageDurationMs: number;
  buckets: RequestHistoryBucket[];
}

export interface DeletedCountResponse {
  deletedCount: number;
}
