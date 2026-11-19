# Desktop vs mobile gap

What the Mux desktop app (`~/Code/Mux`, `src/Mux.Desktop`) can do that the Mux Cloud mobile app cannot, as of
2026-11-18 (Mux `feature/v2.0.0`, MuxCloud `main`). `parity.json` compares the app with the local web dashboard; this
file compares it with the desktop app.

Totals: 90 desktop capabilities. **35 available, 21 partial, 34 missing.** About ten are desktop-only by nature
(marked `[D]`). "API ok" means the mux REST API already supports it (mobile client work only); "new API" means mux
needs a server change first.

## Missing and partial

### Chat and composer

| Feature | Desktop | Mobile | Work |
|---|---|---|---|
| One-tap copy on assistant replies | `CopyButton.cs` | Partial (select only) | Mobile only |
| Syntax-highlighted code, collapsible `<details>` | `MarkdownRenderer.cs`, `SyntaxHighlighter.cs` | Partial | Mobile only |
| Expandable tool cards (arguments, result) | `ToolCardView.cs` | Partial (name, status, time) | API ok for saved turns; new API for live SSE tool arguments |
| Per-turn info (model calls, tool calls, errors, context) | `AddTurnInfo` | Partial | API ok (`GET /runs/{id}`, wrapper unused) |
| Context usage indicator | `MainWindow.cs` | Missing | API ok |
| Model ready / unreachable indicator | `MainWindow.cs` | Missing | API ok (`POST /model/load` result is discarded) |
| Auto-compaction notice | `MainWindow.cs` | Missing | Partly new API (no SSE event) |
| `#` / `#global` quick memory | `MainWindow.cs` | Missing | API ok (`POST /memory`, wrapper unused) |
| Slash-command autocomplete | `MainWindow.cs` | Missing | Mobile only |
| Prompt history recall | `PromptHistoryStore.cs` | Missing | Mobile only (history picker) |
| Clickable `/help` card | `MainWindow.cs` | Partial | Mobile only |
| `/label`, `/tag` commands | `MainWindow.cs` | Partial (long-press sheet only) | API ok |
| `/effort` quick picker | `ReasoningEffortDialog.cs` | Partial (endpoint form only) | API ok |
| Auto-expand thinking setting | `MainWindow.cs` | Missing | Mobile only |
| `[D]` Composer keyboard shortcuts | `MainWindow.cs` | Missing | Keyboard only |

### Conversations

| Feature | Desktop | Mobile | Work |
|---|---|---|---|
| Parallel tabs with running / approval / unread / error indicators | `WorkspaceViewModel.cs` | Partial (`[D]` tabs; status dots are portable) | API ok (`GET /runs`) |
| `/cwd` show or change folder mid-conversation | `MainWindow.cs` | Partial (set at creation only) | API ok |
| `/instructions` (project instruction files) | `MainWindow.cs` | Missing | API ok (`/context/instructions`, not wrapped) |
| `/trust` | `MainWindow.cs` | Missing | New API |
| `/memory` list, show, delete, clear | `MainWindow.cs` | Missing | API ok (wrappers unused) |
| `/worktrees` list, prune, remove | `MainWindow.cs` | Missing | API ok (wrappers unused) |
| Undo / redo a turn's file changes | `MainWindow.cs` | Missing | API ok (`/checkpoints`, `/undo`, `/redo`; wrappers unused) |
| Manual `/compact` | `MainWindow.cs` | Missing | New API |
| Stats window (token chart, TTFT and latency p95/p99, context) | `StatsWindow.cs` | Partial (last turn only) | API ok (`/usage/summary?session=`) |

### Runs and approvals

| Feature | Desktop | Mobile | Work |
|---|---|---|---|
| `ask_user` question dialog | `AskUserDialog.cs` | Missing | New API (REST chat loop has no ask_user handler) |
| Plan review: approve and auto-accept, keep planning with feedback | `PlanReviewDialog.cs` | Partial ("Run plan" only) | Mobile only |
| Task plan (to-do) card | `MainWindow.cs` | Missing | API ok (socket frames, `/runs/{id}` Tasks) |
| `/processes` list, output, stop | `MainWindow.cs` | Missing | New API |

### Endpoints and models

| Feature | Desktop | Mobile | Work |
|---|---|---|---|
| Validate endpoint with full error | `EndpointValidationWindow.cs` | Missing | API ok |
| Duplicate endpoint | `EndpointsWindow.cs` | Missing | Mobile only |
| Import models with multi-select | `ImportModelsDialog.cs` | Partial (import all, first 20) | API ok |

### Configuration

| Feature | Desktop | Mobile | Work |
|---|---|---|---|
| Web search providers | `SearchProvidersWindow.cs` | Missing | New API |
| Settings: SystemPromptPath, MaxTokenBudget, context safety margin, token ratio, skill refresh, SkillsDirectory, telemetry | `SettingsWindow.cs` | Partial | New API (not in `SettingsDto`) |
| Keybindings: full list with defaults, key capture, unbind, reset | `KeybindingsWindow.cs` | Partial (raw overrides) | New API (defaults not exposed) |
| MCP live status, failure details, tool names | `McpServersWindow.cs` | Partial | API ok |
| Skill scaffold form | `SkillScaffoldDialog.cs` | Partial (raw template) | Mobile only |
| `[D]` Import skill from a local folder | `SkillsWindow.cs` | Missing | OS folder picker |

### Usage

| Feature | Desktop | Mobile | Work |
|---|---|---|---|
| Endpoint and conversation filters | `UsageDashboardWindow.cs` | Missing | API ok |
| Metric-by-dimension stacked chart | `UsageDashboardWindow.cs` | Missing | API ok (`/usage/timeseries/split`) |
| Latency / TTFT / throughput percentiles | `UsageDashboardWindow.cs` | Missing | API ok |
| Bars / lines toggle | `UsageDashboardWindow.cs` | Missing | Mobile only |
| Chart CSV export; `[D]` PNG | `UsageChartExport.cs` | Partial | Mobile only |
| Click a bucket or heatmap cell to filter calls | `UsageDashboardWindow.cs` | Missing | API ok |
| Full sortable, paged call table | `UsageDashboardWindow.cs` | Partial (latest 50) | API ok |

### App, files, other

| Feature | Desktop | Mobile | Work |
|---|---|---|---|
| `@file` mentions | `MainWindow.cs` | Partial | API ok for completion (`/files/complete`); new API for the attached-files notice |
| AI-generated conversation titles | `MainWindow.cs` | Partial (first prompt) | Server change |
| Help: documentation and report-an-issue links | `MainWindow.cs` | Missing | Mobile only |
| `[D]` Command palette, rebindable shortcuts, macOS menus, collapsible sidebar, local server window, Mux Cloud sign in/out of this machine, setup wizard, single instance and splash | various | Missing | Desktop only by nature |

## Already on mobile

Streaming chat, stop, thinking, approvals with countdown and the cross-machine inbox, auto-approve, plan mode, endpoint
picker and switch, `/<skill>`, `/help`, `/new`, `/clear`, live mirroring, conversation list / open / continue / new
with folder, rename, labels and tags, export, delete, bulk delete, overview, endpoints CRUD and default, prompt profiles
and catalog, subagents, hooks, custom commands, MCP CRUD and validate, skills and skill packs, the core usage
dashboard, pricing, settings fields the API exposes, palettes, language, theme, remote tool approval, about.

## New mux server routes needed

trust, processes, compact, ask_user (event and answer), web search providers, the missing settings fields, the default
keybinding list, live tool arguments on the SSE stream, an attached-files notice, and AI titles for REST-started
conversations.
