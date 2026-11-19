import { relayPath, type ApiClient } from '@dashboard/api';
import type {
  MuxChatCapabilities,
  MuxCheckpointResult,
  MuxCheckpointStatus,
  MuxEndpoint,
  MuxEndpointSummary,
  MuxFileCompletion,
  MuxInstructions,
  MuxMcpValidation,
  MuxMemoryList,
  MuxModelLoad,
  MuxRunState,
  MuxUsageEventsPage,
  MuxUsageQuery,
  MuxUsageSeries,
  MuxWorktree,
  MuxListResponse,
  MuxModelList,
  MuxOverview,
  MuxPluginConfig,
  MuxPricingTable,
  MuxPromptCatalogEntry,
  MuxRunCancelReply,
  MuxRunSummary,
  MuxSessionDetail,
  MuxSessionExport,
  MuxSessionMetadataPatch,
  MuxSessionSaveRequest,
  MuxSessionSummary,
  MuxSkill,
  MuxSkillPack,
  MuxUsageBucket,
  MuxUsageFilters,
  MuxUsageRange,
  MuxUsageSummary,
  MuxWorkspace,
} from '@/types/mux';

/** Generic JSON response for routes whose exact shape is rendered generically. */
export type MuxJson = Record<string, unknown>;

const enc = encodeURIComponent;

/** Query string for the usage routes: a window (`from`/`to` win over `range`) plus filters. */
export function usageQuery(q: MuxUsageQuery & { [key: string]: unknown }): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(q)) {
    if (value === undefined || value === null || value === '') continue;
    if (key === 'range' && (q.from !== undefined || q.to !== undefined)) continue;
    parts.push(enc(key) + '=' + enc(String(value)));
  }
  return parts.length ? '?' + parts.join('&') : '';
}

const wd = (dir?: string | null) => (dir ? 'workingDirectory=' + enc(dir) : '');
const qs = (...parts: string[]) => {
  const kept = parts.filter(Boolean);
  return kept.length ? '?' + kept.join('&') : '';
};

/**
 * Typed calls to a machine's own mux API through the relay (`/m/{machineId}/v1.0/api/...`). Under the parity rule every
 * route the local mux dashboard uses is available here, with the same request and response bodies.
 */
export function muxApi(client: ApiClient, machineId: string) {
  const p = (path: string) => relayPath(machineId, path);
  const get = <T>(path: string) => client.get<T>(p(path));
  const put = <T>(path: string, body: unknown) => client.put<T>(p(path), body);
  const post = <T>(path: string, body: unknown) => client.post<T>(p(path), body);
  const del = <T>(path: string) => client.delete<T>(p(path));

  return {
    machineId,
    path: p,
    health: () => get<MuxJson>('/v1.0/api/health'),
    overview: () => get<MuxOverview>('/v1.0/api/overview'),

    sessions: () => get<MuxListResponse<MuxSessionSummary>>('/v1.0/api/sessions'),
    session: (id: string) => get<MuxSessionDetail>('/v1.0/api/sessions/detail?id=' + enc(id)),
    saveSession: (request: MuxSessionSaveRequest) => put<MuxSessionSummary>('/v1.0/api/sessions', request),
    patchMetadata: (id: string, patch: MuxSessionMetadataPatch) =>
      post<MuxSessionSummary>('/v1.0/api/sessions/' + enc(id) + '/metadata', patch),
    exportSession: (id: string, format: 'md' | 'json' | string) =>
      get<MuxSessionExport>('/v1.0/api/sessions/export?id=' + enc(id) + '&format=' + enc(format)),
    deleteSession: (id: string) => del<null>('/v1.0/api/sessions?id=' + enc(id)),

    approve: (runId: string, toolCallId: string, decision: string) =>
      post<MuxJson>('/v1.0/api/chat/approve', { RunId: runId, ToolCallId: toolCallId, Decision: decision }),
    runs: () => get<MuxListResponse<MuxRunSummary>>('/v1.0/api/runs'),
    run: (runId: string) => get<MuxRunState>('/v1.0/api/runs/' + enc(runId)),
    cancelRun: (runId: string) => post<MuxRunCancelReply>('/v1.0/api/runs/' + enc(runId) + '/cancel', {}),
    loadModel: (endpoint: string) => post<MuxModelLoad>('/v1.0/api/model/load', { Endpoint: endpoint }),
    instructions: (workingDirectory?: string | null) => get<MuxInstructions>('/v1.0/api/context/instructions' + qs(wd(workingDirectory))),
    completeFiles: (prefix: string, workingDirectory?: string | null, max = 20) =>
      get<MuxFileCompletion>('/v1.0/api/files/complete' + qs('prefix=' + enc(prefix), wd(workingDirectory), 'max=' + max)),

    endpoints: () => get<MuxListResponse<MuxEndpointSummary>>('/v1.0/api/endpoints'),
    endpointsDetail: () => get<MuxListResponse<MuxEndpoint>>('/v1.0/api/endpoints/detail'),
    saveEndpoints: (items: MuxEndpoint[]) => put<MuxListResponse<MuxEndpoint>>('/v1.0/api/endpoints', { Items: items }),
    deleteEndpoint: (name: string) => del<MuxListResponse<MuxEndpoint>>('/v1.0/api/endpoints?name=' + enc(name)),
    endpointModels: (name: string) => get<MuxModelList>('/v1.0/api/endpoints/models?name=' + enc(name)),
    importModels: (source: string, models: string[]) =>
      post<MuxListResponse<MuxEndpoint>>('/v1.0/api/endpoints/import', { Source: source, Models: models }),

    workspaces: () => get<MuxListResponse<MuxWorkspace>>('/v1.0/api/workspaces'),
    chatCapabilities: () => get<MuxChatCapabilities>('/v1.0/api/chat/capabilities'),

    settings: () => get<MuxJson>('/v1.0/api/settings'),
    saveSettings: (settings: MuxJson) => put<MuxJson>('/v1.0/api/settings', settings),

    collection: (path: string) => get<MuxListResponse<MuxJson>>(path),
    saveCollection: (path: string, items: MuxJson[]) => put<MuxListResponse<MuxJson>>(path, { Items: items }),
    deleteNamed: (path: string, name: string) => del<MuxListResponse<MuxJson>>(path + '?name=' + enc(name)),
    validateMcp: (name: string) => post<MuxMcpValidation>('/v1.0/api/mcp-servers/validate', { Name: name }),

    hooks: () => get<MuxPluginConfig>('/v1.0/api/hooks'),
    saveHooks: (config: MuxPluginConfig) => put<MuxPluginConfig>('/v1.0/api/hooks', config),

    promptCatalog: () => get<MuxListResponse<MuxPromptCatalogEntry>>('/v1.0/api/prompts/catalog'),
    savePromptOverride: (key: string, content: string) => put<MuxJson>('/v1.0/api/prompts/catalog', { key, content }),

    skills: () => get<MuxListResponse<MuxSkill>>('/v1.0/api/skills'),
    skill: (name: string) => get<MuxSkill>('/v1.0/api/skills/detail?id=' + enc(name)),
    setSkillEnabled: (name: string, enabled: boolean) =>
      put<MuxListResponse<MuxSkill>>('/v1.0/api/skills/enabled', { Id: name, Enabled: enabled }),
    setSkillCategory: (name: string, category: string | null) =>
      put<MuxJson>('/v1.0/api/skills/category', { Id: name, Category: category }),
    skillCategories: () => get<{ Known?: string[] } & MuxJson>('/v1.0/api/skills/categories'),
    saveSkillBody: (name: string, body: string) =>
      put<MuxListResponse<MuxSkill>>('/v1.0/api/skills/body', { Id: name, Body: body }),
    createSkill: (name: string, body: string) => post<MuxListResponse<MuxSkill>>('/v1.0/api/skills', { Name: name, Body: body }),
    deleteSkill: (name: string) => del<MuxListResponse<MuxSkill>>('/v1.0/api/skills?id=' + enc(name)),
    expandSkill: (input: string) => post<MuxJson>('/v1.0/api/skills/expand', { Input: input }),
    skillPacks: () => get<MuxListResponse<MuxSkillPack>>('/v1.0/api/skills/packs'),
    skillPack: (id: string) => get<MuxSkillPack>('/v1.0/api/skills/packs/' + enc(id)),
    installPack: (pack: string, skill?: string) => post<MuxJson>('/v1.0/api/skills/packs/install', { Pack: pack, Skill: skill }),
    removePack: (pack: string, skill?: string) => post<MuxJson>('/v1.0/api/skills/packs/remove', { Pack: pack, Skill: skill }),

    usageFilters: () => get<MuxUsageFilters>('/v1.0/api/usage/filters'),
    usageSummary: (range: MuxUsageRange, filters: MuxUsageQuery = {}) => get<MuxUsageSummary>('/v1.0/api/usage/summary' + usageQuery({ range, ...filters })),
    usageSplit: (range: MuxUsageRange, dimension: string, filters: MuxUsageQuery = {}) =>
      get<MuxListResponse<MuxUsageSeries>>('/v1.0/api/usage/timeseries/split' + usageQuery({ range, ...filters, dimension })),
    usageTimeseries: (range: MuxUsageRange, filters: MuxUsageQuery = {}) =>
      get<MuxListResponse<MuxUsageBucket>>('/v1.0/api/usage/timeseries' + usageQuery({ range, ...filters })),
    usageBreakdown: (range: MuxUsageRange, dimension: string, filters: MuxUsageQuery = {}) =>
      get<MuxListResponse<MuxJson>>('/v1.0/api/usage/breakdown' + usageQuery({ range, ...filters, dimension })),
    usageHeatmap: (range: MuxUsageRange, tzOffsetMinutes: number, filters: MuxUsageQuery = {}) =>
      get<MuxJson>('/v1.0/api/usage/heatmap' + usageQuery({ range, ...filters, tzOffsetMinutes })),
    usageErrors: (range: MuxUsageRange, filters: MuxUsageQuery = {}) => get<MuxListResponse<MuxJson>>('/v1.0/api/usage/errors' + usageQuery({ range, ...filters })),
    usageEvents: (range: MuxUsageRange, filters: MuxUsageQuery = {}) => get<MuxUsageEventsPage>('/v1.0/api/usage/events' + usageQuery({ range, ...filters })),
    pricing: () => get<MuxPricingTable>('/v1.0/api/usage/pricing'),
    savePricing: (table: MuxPricingTable) => put<MuxPricingTable>('/v1.0/api/usage/pricing', table),

    palettes: () => get<MuxJson>('/v1.0/api/palettes'),
    setActivePalette: (id: string) => put<MuxJson>('/v1.0/api/palettes/active', { Id: id }),
    savePalette: (body: { Palette: MuxJson; Activate: boolean }) => put<MuxJson>('/v1.0/api/palettes', body),
    deletePalette: (id: string) => del<MuxJson>('/v1.0/api/palettes?id=' + enc(id)),

    memory: (workingDirectory?: string | null) => get<MuxMemoryList>('/v1.0/api/memory' + qs(wd(workingDirectory))),
    saveMemory: (entry: { Name: string; Description: string; Content: string; Scope: string; WorkingDirectory?: string | null }) =>
      post<MuxJson>('/v1.0/api/memory', entry),
    deleteMemory: (name: string, scope?: string, workingDirectory?: string | null) =>
      del<MuxJson>('/v1.0/api/memory' + qs('name=' + enc(name), scope ? 'scope=' + enc(scope) : '', wd(workingDirectory))),

    worktrees: (workingDirectory?: string | null) => get<MuxListResponse<MuxWorktree>>('/v1.0/api/worktrees' + qs(wd(workingDirectory))),
    pruneWorktrees: (workingDirectory?: string | null) => post<MuxJson>('/v1.0/api/worktrees/prune' + qs(wd(workingDirectory)), {}),
    deleteWorktree: (name: string, force: boolean, workingDirectory?: string | null) =>
      del<MuxJson>('/v1.0/api/worktrees' + qs('name=' + enc(name), 'force=' + (force ? 'true' : 'false'), wd(workingDirectory))),

    checkpoints: (workingDirectory: string) =>
      get<MuxCheckpointStatus>('/v1.0/api/checkpoints?workingDirectory=' + enc(workingDirectory)),
    undo: (workingDirectory: string) => post<MuxCheckpointResult>('/v1.0/api/checkpoints/undo', { WorkingDirectory: workingDirectory }),
    redo: (workingDirectory: string) => post<MuxCheckpointResult>('/v1.0/api/checkpoints/redo', { WorkingDirectory: workingDirectory }),
  };
}

export type MuxApi = ReturnType<typeof muxApi>;
