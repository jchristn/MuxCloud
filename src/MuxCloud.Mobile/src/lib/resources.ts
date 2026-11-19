import type { FieldHints } from '@/components/ObjectForm';

export const ADAPTER_TYPES = ['ollama', 'ollama-cloud', 'openai', 'openai-compatible', 'vllm', 'anthropic', 'gemini', 'azure-openai', 'vertex', 'bedrock', 'xai'];
export const REASONING_EFFORTS = ['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'];
export const HOOK_EVENTS = ['session-start', 'user-prompt-submit', 'pre-tool-use', 'post-tool-use', 'stop', 'session-end'];

/** A mux configuration collection edited with the generic collection editor. */
export interface CollectionResource {
  /** Route segment under /machines/{id}/manage/. */
  segment: string;
  /** Catalog key for the title (under mobile.manage.*). */
  titleKey: string;
  introKey: string;
  path: string;
  keyField: string;
  template: Record<string, unknown>;
  hints: FieldHints;
  subtitle: (item: Record<string, unknown>) => string;
  /** Delete through `DELETE {path}?name=` instead of re-saving the collection. */
  deleteByName?: boolean;
  /** Part of the hooks document (`{Hooks, Commands}`), not a `{Items}` collection. */
  pluginPart?: 'Hooks' | 'Commands';
}

const s = (v: unknown) => (v === null || v === undefined ? '' : String(v));

/**
 * Every collection the local mux dashboard edits, with the same templates the dashboard uses for "Add". Field names are
 * mux's own configuration names, so they read the same here as in settings.json and the docs.
 */
export const COLLECTIONS: CollectionResource[] = [
  {
    segment: 'endpoints',
    titleKey: 'mobile.manage.endpoints',
    introKey: 'mobile.manage.endpointsIntro',
    path: '/v1.0/api/endpoints',
    keyField: 'Name',
    deleteByName: true,
    template: {
      Name: '',
      AdapterType: 'ollama',
      BaseUrl: 'http://127.0.0.1:11434',
      Model: '',
      IsDefault: false,
      MaxTokens: 4096,
      Temperature: 0.7,
      ContextWindow: 32768,
      TimeoutMs: 120000,
      AutoApproveTools: false,
      ToolAutoApproveSeconds: null,
      MaxAgentIterations: null,
      ShowThinking: false,
      ReasoningEffort: null,
      ApiKey: null,
      Region: null,
      Project: null,
      ApiVersion: null,
      AuthPlacement: 'bearer',
      AuthParameterName: null,
      Headers: [],
    },
    hints: {
      AdapterType: { options: ADAPTER_TYPES },
      ReasoningEffort: { options: REASONING_EFFORTS, nullable: true },
      ApiKey: { secret: true, nullable: true, hint: 'Leave empty to keep the saved key.' },
      ApiKeySet: { readOnly: true },
      AuthPlacement: { options: ['bearer', 'header', 'query'] },
      Headers: { itemTemplate: { Key: '', Value: '' } },
      'Headers.ValueSet': { hidden: true },
      'Headers.Value': { secret: true },
      Region: { nullable: true },
      Project: { nullable: true },
      ApiVersion: { nullable: true },
      AuthParameterName: { nullable: true },
    },
    subtitle: (i) => [s(i.AdapterType), s(i.Model), s(i.BaseUrl)].filter(Boolean).join(' · '),
  },
  {
    segment: 'mcp',
    titleKey: 'mobile.manage.mcp',
    introKey: 'mobile.manage.mcpIntro',
    path: '/v1.0/api/mcp-servers',
    keyField: 'Name',
    deleteByName: true,
    template: { Name: '', Transport: 'stdio', Command: '', Args: [], Env: [], Url: null, McpPath: null, AuthType: 'none', AuthHeader: null, AuthSecret: null },
    hints: {
      Transport: { options: ['stdio', 'http'] },
      AuthType: { options: ['none', 'bearer', 'header'] },
      AuthSecret: { secret: true, nullable: true },
      AuthSecretSet: { readOnly: true },
      Env: { hint: 'KEY=value, one per line.' },
      Url: { nullable: true },
      McpPath: { nullable: true },
      AuthHeader: { nullable: true },
      Command: { nullable: true },
    },
    subtitle: (i) => (s(i.Transport) === 'http' ? s(i.Url) : [s(i.Command), ...((i.Args as string[]) ?? [])].join(' ')),
  },
  {
    segment: 'prompts',
    titleKey: 'mobile.manage.prompts',
    introKey: 'mobile.manage.promptsIntro',
    path: '/v1.0/api/prompts',
    keyField: 'Name',
    template: { Name: '', IsActive: false, SystemPrompt: '', ToolsDisabledPrompt: null, CompactionPrompt: null },
    hints: { SystemPrompt: { multiline: true }, ToolsDisabledPrompt: { multiline: true, nullable: true }, CompactionPrompt: { multiline: true, nullable: true } },
    subtitle: (i) => s(i.SystemPrompt).slice(0, 80),
  },
  {
    segment: 'subagents',
    titleKey: 'mobile.manage.subagents',
    introKey: 'mobile.manage.subagentsIntro',
    path: '/v1.0/api/subagents',
    keyField: 'Name',
    template: { Name: '', Description: '', SystemPrompt: '', EndpointName: null, AllowedTools: [], MaxIterations: null, Isolation: null },
    hints: { SystemPrompt: { multiline: true }, EndpointName: { nullable: true }, Isolation: { options: ['none', 'worktree'], nullable: true } },
    subtitle: (i) => s(i.Description),
  },
  {
    segment: 'hooks',
    titleKey: 'mobile.manage.hooks',
    introKey: 'mobile.manage.hooksIntro',
    path: '/v1.0/api/hooks',
    keyField: 'Name',
    pluginPart: 'Hooks',
    template: { Name: '', Event: 'session-start', Matcher: '', Command: '', Args: [], Blocking: false, TimeoutMs: 15000 },
    hints: { Event: { options: HOOK_EVENTS } },
    subtitle: (i) => [s(i.Event), s(i.Command)].filter(Boolean).join(' · '),
  },
  {
    segment: 'commands',
    titleKey: 'mobile.manage.commands',
    introKey: 'mobile.manage.commandsIntro',
    path: '/v1.0/api/hooks',
    keyField: 'Name',
    pluginPart: 'Commands',
    template: { Name: '', Description: '', Command: '', Args: [], TimeoutMs: 30000 },
    hints: {},
    subtitle: (i) => s(i.Description) || s(i.Command),
  },
];

export function collectionFor(segment: string): CollectionResource | undefined {
  return COLLECTIONS.find((c) => c.segment === segment);
}

/** Bespoke management screens (not generic collections), in menu order. */
export const SCREENS = ['settings', 'catalog', 'skills', 'search', 'keybindings', 'memory', 'worktrees', 'processes', 'usage', 'pricing', 'palettes'] as const;
