/**
 * Shapes of a machine's own mux API, relayed through `/m/{machineId}`. Mux serializes PascalCase. Sources: Mux
 * src/Mux.Server/Models (ChatDtos.cs, ServerDtos.cs, ConfigDtos.cs, RunDtos.cs, WorkspaceDto.cs, SettingsDto.cs) and the
 * WebSocket frames in src/Mux.Core/Runs (WEBSOCKETS_API.md in the mux repository). The list summary types are shared
 * with the dashboard (`@dashboard/types`); everything a full client needs beyond that lives here.
 */
import type { MuxListResponse, MuxSessionSummary, MuxSessionTag } from '@dashboard/types';

export type { MuxListResponse, MuxSessionSummary, MuxSessionTag };

export interface MuxToolCall {
  Id: string;
  Name: string;
  Arguments: string;
}

export interface MuxChatStats {
  TtftMs?: number;
  StreamingMs?: number;
  TotalMs?: number;
  InputTokens?: number;
  OutputTokens?: number;
  TotalTokens?: number;
}

export interface MuxChatMessage {
  Role: 'user' | 'assistant' | 'system' | 'tool' | string;
  Content: string;
  Reasoning?: string | null;
  DisplayOnly?: boolean;
  Model?: string | null;
  Stats?: MuxChatStats | null;
  ToolCalls?: MuxToolCall[] | null;
  ToolCallId?: string | null;
}

export interface MuxSessionDetail {
  Id: string;
  Title: string;
  EndpointName: string;
  Model: string;
  Labels: string[];
  Tags: MuxSessionTag[];
  WorkingDirectory: string;
  Messages: MuxChatMessage[];
}

export interface MuxSessionSaveRequest {
  Id?: string;
  Title?: string;
  EndpointName: string;
  Model: string;
  Labels?: string[];
  Tags?: MuxSessionTag[];
  Messages: MuxChatMessage[];
}

export interface MuxSessionMetadataPatch {
  AddLabels?: string[];
  RemoveLabels?: string[];
  SetTags?: MuxSessionTag[];
  RemoveTagKeys?: string[];
}

export interface MuxSessionExport {
  Format: string;
  Filename: string;
  Content: string;
}

export interface MuxChatRequest {
  Endpoint: string;
  Id?: string;
  WorkingDirectory?: string | null;
  Messages: { Role: string; Content: string; DisplayOnly?: boolean }[];
  PlanMode?: boolean;
  /** Run tools that would prompt without asking; the machine honors it only when this caller may approve tools. */
  AutoApproveTools?: boolean;
}

/** GET /v1.0/api/chat/capabilities: what this caller may do about tool approvals (mux 2.0.0 and later). */
export interface MuxChatCapabilities {
  ToolApprovals: boolean;
  AutoApproveTools: boolean;
  Relayed: boolean;
  Reason: string;
}

export interface MuxChatReply {
  Role: string;
  Id: string;
  Content: string;
  Endpoint: string;
  Model: string;
  Stats?: MuxChatStats;
}

export interface MuxApprovalRequest {
  ToolAutoApproveSeconds: number;
  RunId: string;
  ToolCallId: string;
  Name: string;
  Arguments: string;
}

/** Decision values mux accepts: approve once, always for this tool, or deny. */
export type MuxApprovalDecision = 'y' | 'always' | 'n';

export interface MuxToolEvent {
  Id: string;
  Name: string;
  Status: 'running' | 'ok' | 'fail' | string;
  ElapsedMs?: number;
}

export interface MuxRunSummary {
  RunId: string;
  SessionId: string;
  EndpointName: string;
  Model: string;
  Status: string;
  IsTerminal: boolean;
  StartedUtc: string;
  CompletedUtc?: string | null;
}

export interface MuxRunCancelReply {
  Ok: boolean;
  RunId: string;
  Status: string;
}

export interface MuxEndpointSummary {
  Name: string;
  AdapterType: string;
  BaseUrl?: string | null;
  Model: string;
  IsDefault: boolean;
}

export interface MuxHeader {
  Key: string;
  Value: string;
  ValueSet?: boolean;
}

export interface MuxEndpoint {
  Name: string;
  AdapterType: string;
  BaseUrl: string;
  Model: string;
  IsDefault: boolean;
  MaxTokens: number;
  Temperature: number;
  ContextWindow: number;
  TimeoutMs: number;
  AutoApproveTools: boolean;
  ToolAutoApproveSeconds?: number | null;
  MaxAgentIterations?: number | null;
  ShowThinking: boolean;
  ReasoningEffort?: string | null;
  ApiKeySet: boolean;
  ApiKey?: string | null;
  Region?: string | null;
  Project?: string | null;
  ApiVersion?: string | null;
  AuthPlacement: string;
  AuthParameterName?: string | null;
  Headers: MuxHeader[];
}

export interface MuxModelList {
  Success: boolean;
  ErrorMessage?: string | null;
  Models?: { Id?: string; Name?: string }[] | string[];
}

export interface MuxWorkspace {
  Path: string;
  Name: string;
  Source: 'recent' | 'home' | string;
  LastUsedUtc?: string | null;
  SessionCount: number;
}

export interface MuxOverviewNotice {
  Level: 'info' | 'warning' | 'success' | string;
  Text: string;
}

export interface MuxOverview {
  Version: string;
  ConfigDir: string;
  Uptime: string;
  AuthEnabled: boolean;
  Endpoints: number;
  DefaultEndpoint?: string | null;
  DefaultAdapter?: string | null;
  DefaultModel?: string | null;
  McpServers: number;
  Prompts: number;
  ActivePrompt?: string | null;
  Subagents: number;
  SkillsTotal: number;
  SkillsEnabled: number;
  SkillsInvalid: number;
  Hooks: number;
  Commands: number;
  Keybindings: number;
  Sessions: number;
  TotalMessages: number;
  RecentSessions: MuxSessionSummary[];
  Notices: MuxOverviewNotice[];
}

export interface MuxSkill {
  Name: string;
  Title: string;
  Description: string;
  Enabled: boolean;
  Valid: boolean;
  Mutating: boolean;
  Commands: number;
  Errors: string[];
  Category: string;
  CategoryOverridden: boolean;
  FileCategory: string;
  Body?: string | null;
}

export interface MuxSkillPack {
  Id: string;
  Title?: string;
  Description?: string;
  Category?: string;
  Installed?: boolean;
  Skills?: { Id: string; Title?: string; Description?: string; Installed?: boolean }[];
  [key: string]: unknown;
}

export interface MuxPromptCatalogEntry {
  Key: string;
  Kind: string;
  Scope: string;
  DisplayName: string;
  Description: string;
  Placeholders: string[];
  Default: string;
  Effective: string;
  Overridden: boolean;
  Editable: boolean;
}

export interface MuxPluginConfig {
  Hooks: Record<string, unknown>[];
  Commands: Record<string, unknown>[];
}

export interface MuxPricingModel {
  inputPerMTok: number;
  cachedInputPerMTok: number;
  outputPerMTok: number;
}

export interface MuxPricingTable {
  version: string;
  models: Record<string, MuxPricingModel>;
}

export interface MuxUsageFilters {
  Enabled: boolean;
  Endpoints: string[];
  Models: string[];
  Labels: string[];
  Tags: MuxSessionTag[];
}

export type MuxUsageRange = 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year' | 'all';

/** Usage metrics are rendered generically: numeric fields become rows, nested objects become sections. */
export interface MuxUsageSummary {
  Metrics?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface MuxUsageBucket {
  StartUtc?: string;
  EndUtc?: string;
  Metrics?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface MuxMemoryEntry {
  Name?: string;
  Key?: string;
  Content?: string;
  Scope?: string;
  [key: string]: unknown;
}

export interface MuxCheckpointStatus {
  WorkingDirectory: string;
  IsRepository: boolean;
  CanUndo: boolean;
  CanRedo: boolean;
}

export interface MuxCheckpointResult {
  Restored: boolean;
  Label?: string | null;
  CanUndo: boolean;
  CanRedo: boolean;
}

/** Frames on a machine's `/v1.0/ws`. camelCase (the canonical run event envelope). */
export interface MuxWsFrame {
  eventType: string;
  contractVersion?: string;
  timestampUtc?: string;
  runId?: string;
  sessionId?: string;
  text?: string;
  toolCall?: { id?: string; name?: string; arguments?: string };
  toolCallId?: string;
  toolName?: string;
  arguments?: string;
  toolAutoApproveSeconds?: number;
  decision?: string;
  elapsedMs?: number;
  result?: { success?: boolean };
  status?: string;
  code?: string;
  message?: string;
}
