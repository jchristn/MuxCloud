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
  /** Stream `ask_user` questions and wait for answers (ignored by a mux without ask_user). */
  AskUser?: boolean;
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
  /** Raw JSON arguments, on the `running` event (newer mux). */
  Arguments?: string | null;
  /** The tool's output on the finished event, cut to 8000 characters (`ResultTruncated`). */
  Result?: string | null;
  ResultTruncated?: boolean;
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
  PendingApprovalCount?: number;
  /** ask_user questions waiting for an answer; the run reads `awaiting_approval` while any is pending. */
  PendingQuestionCount?: number;
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

/** `GET /runs/{id}`: one run's counters, current tool, last error, and task plan (kept ~5 minutes after it ends). */
export interface MuxRunTask {
  Id: string;
  Title: string;
  Status: string;
}

export interface MuxRunState extends MuxRunSummary {
  IterationsCompleted: number;
  ToolCallCount: number;
  ErrorCount: number;
  InputTokens: number;
  OutputTokens: number;
  TotalTokens: number;
  FinalEstimatedTokens: number;
  CurrentToolName?: string | null;
  LastError?: string | null;
  TotalTaskCount: number;
  CompletedTaskCount: number;
  Tasks: MuxRunTask[];
}

/** `POST /model/load`: whether the endpoint's model is ready. */
export interface MuxModelLoad {
  Ok: boolean;
  Reachable: boolean;
  Error?: string | null;
}

/** `GET /context/instructions`: the project instruction files a run in a folder loads. */
export interface MuxInstructions {
  WorkingDirectory: string;
  Enabled: boolean;
  Sources: string[];
  DroppedSources: string[];
  TotalBytes: number;
  Truncated: boolean;
  Text: string;
}

/** `GET /files/complete`: `@` mention completion. */
export interface MuxFileCompletion {
  WorkingDirectory: string;
  Prefix: string;
  Paths: string[];
  Mentions: string[];
}

/** `GET /memory`: memories visible from a folder (project first, then global). */
export interface MuxMemory {
  Name: string;
  Scope: 'project' | 'global' | string;
  Description: string;
  Content: string;
  CreatedUtc?: string;
  UpdatedUtc?: string;
}

export interface MuxMemoryList {
  WorkingDirectory: string;
  ProjectKey?: string;
  Enabled: boolean;
  Memories: MuxMemory[];
}

/** `GET /worktrees`: an isolated git worktree mux made for a subagent or job. */
export interface MuxWorktree {
  Name: string;
  Path: string;
  Branch: string;
  Head?: string;
  BaseCommit?: string;
  Kind?: string;
  CreatedUtc?: string;
  Exists: boolean;
  Dirty: boolean;
  CommitsAhead: number;
}

/** `POST /mcp-servers/validate`. */
export interface MuxMcpValidation {
  Name: string;
  Connected: boolean;
  Method?: string;
  ToolCount: number;
  Tools?: (string | { Name?: string; Description?: string })[];
  Error?: string | null;
  Details?: string | null;
  ElapsedMs?: number;
}

/** Usage filters shared by the usage routes (`from`/`to` override `range`). */
export interface MuxUsageQuery {
  range?: MuxUsageRange;
  from?: number;
  to?: number;
  endpoint?: string;
  session?: string;
  model?: string;
  success?: boolean;
  page?: number;
  pageSize?: number;
}

/** `GET /usage/timeseries/split`: one series per dimension value. */
export interface MuxUsageSeries {
  Key: string;
  IsOther: boolean;
  Buckets: { BucketStartUnixMs: number; Metrics?: Record<string, unknown> }[];
}

/** `GET /usage/events` page. */
export interface MuxUsageEventsPage {
  Items: Record<string, unknown>[];
  TotalCount: number;
  PageNumber: number;
  PageSize: number;
}

/** An `ask_user` question: from the chat stream (PascalCase) or a run frame (camelCase), normalized. */
export interface MuxQuestion {
  runId: string;
  questionId: string;
  sessionId?: string;
  question: string;
  options: { label: string; description?: string }[];
  multiSelect: boolean;
  allowOther: boolean;
  allowSkip: boolean;
  timeoutSeconds: number;
  receivedAt: number;
}

/** `POST /chat/answer` body. */
export interface MuxAnswer {
  RunId: string;
  QuestionId: string;
  Answers: string[];
  Other?: string | null;
  Skip: boolean;
}

/** The `attachments` chat event: what `@path` mentions attached to the prompt. */
export interface MuxAttachments {
  Attached: { Path: string; Kind: 'file' | 'directory' | string; Bytes?: number; Lines?: number; Inlined?: boolean }[];
  Skipped: { Path: string; Reason: string }[];
  Notes: string[];
  TotalBytes: number;
}

/** The `compacted` chat event and the `POST /sessions/{id}/compact` result. */
export interface MuxCompaction {
  Compacted?: boolean;
  Message?: string;
  Endpoint?: string;
  MessagesBefore: number;
  MessagesAfter: number;
  EstimatedTokensBefore: number;
  EstimatedTokensAfter: number;
  ContextWindow?: number;
  SummaryCreated?: boolean;
  Strategy?: string;
  Reason?: string;
}

/** `GET /processes` item: a background process a tool started. */
export interface MuxProcess {
  Id: string;
  Name?: string | null;
  Command: string;
  WorkingDirectory?: string | null;
  ProcessId?: number | null;
  StartedUtc: string;
  ExitedUtc?: string | null;
  Running: boolean;
  ExitCode?: number | null;
  StoppedByUser?: boolean;
  OutputChars?: number;
  UnreadChars?: number;
}

/** `GET /processes/{id}/output`. */
export interface MuxProcessOutput {
  Id: string;
  Command: string;
  Text: string;
  Running: boolean;
  ExitCode?: number | null;
}

export type MuxTrustLevel = 'all' | 'playbooks' | 'ignore' | 'unknown';

/** `GET`/`PUT /trust`. */
export interface MuxTrust {
  WorkingDirectory: string;
  ProjectRoot?: string | null;
  Level: MuxTrustLevel;
}

export interface MuxSearchProvider {
  Name: string;
  ProviderType: string;
  Endpoint?: string | null;
  /** Write-only: blank keeps the stored key. */
  ApiKey?: string | null;
  ApiKeySet?: boolean;
  Enabled: boolean;
  IsDefault: boolean;
  TimeoutMs?: number;
}

/** `GET`/`PUT /search`: web search providers. */
export interface MuxSearchSettings {
  Enabled: boolean;
  AllowFallback: boolean;
  Providers: MuxSearchProvider[];
  ProviderTypes?: string[];
}

/** `GET /keybindings/commands` item. */
export interface MuxKeybindingCommand {
  CommandId: string;
  Title: string;
  Category: string;
  DefaultChord?: string | null;
  EffectiveChord?: string | null;
  Overridden: boolean;
}
