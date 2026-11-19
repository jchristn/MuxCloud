# Desktop vs mobile gap

What the Mux desktop app (`~/Code/Mux`, `src/Mux.Desktop`) can do that the Mux Cloud mobile app cannot, as of
2026-11-18 (Mux `feature/v2.0.0` at 32f78a8, MuxCloud `main`). `parity.json` compares the app with the local web
dashboard; this file compares it with the desktop app. `MUX_API_PHASE2.md` is the hub contract the phase 2 work uses.

Totals: 90 desktop capabilities. **79 available, 1 partial, 10 missing.** The missing ones are desktop-only by nature
(marked `[D]`).

## Partial

| Feature | Desktop | Mobile | Why |
|---|---|---|---|
| Keybindings key capture | `KeybindingsWindow.cs` | Chord typed as text (ctrl+k) | A phone has no physical keyboard to capture from; the full list, defaults, unbind, and reset are there |

## Missing (desktop only by nature)

| Feature | Desktop | Why it stays on the desktop |
|---|---|---|
| `[D]` Composer keyboard shortcuts | `MainWindow.cs` | Keyboard only |
| `[D]` Import a skill from a local folder | `SkillsWindow.cs` | Needs the machine's folder picker; skill packs and the scaffold form cover mobile |
| `[D]` Chart PNG export | `UsageChartExport.cs` | Use the system screenshot; chart CSV export is on mobile |
| `[D]` Command palette | `MainWindow.cs` | The slash-command autocomplete covers it |
| `[D]` Rebindable shortcuts, macOS menus | various | Desktop shell |
| `[D]` Collapsible sidebar | `MainWindow.cs` | Phones and tablets use their own navigation |
| `[D]` Local server window | `LocalServerWindow.cs` | The machine is reached through Mux Cloud |
| `[D]` Mux Cloud sign in/out of this machine | `MuxCloudWindow.cs` | Done on the machine itself |
| `[D]` Setup wizard | `SetupWizardWindow.cs` | Runs once on the machine |
| `[D]` Single instance and splash | `App.cs` | Desktop process model |

## Added in the parity work

### Phase 1 (existing mux routes)

- **Chat:**
  - copy on replies and code blocks
  - syntax-highlighted code; collapsible `<details>`
  - expandable tool cards
  - per-turn details (`GET /runs/{id}`)
  - context-usage percent and model ready/unreachable dot
  - `#` and `#global` quick memory
  - slash autocomplete (commands, aliases, skills, endpoint names) and `@file` completion
  - recent-prompt picker
  - clickable `/help` card
  - `/label`, `/tag`, `/effort`, `/endpoint`, `/cwd`, `/instructions`, `/memory`, `/worktrees`, `/undo`, `/redo`, and the desktop aliases (`/keys`, `/shortcuts`, `/agents`, `/subagent`, `/endpoint`, `/mcps`, `/prompt`, `/skill`, `/plugin`)
  - auto-expand thinking setting
- **Conversations:**
  - running, needs-you, failed, and unread dots
  - undo/redo and stats in the header
  - stats sheet: tokens per turn, TTFT and latency average/p95/p99, Copy JSON
  - Memory and Worktrees screens
- **Runs:**
  - plan review: run, run and auto-accept edits, keep planning with feedback
  - task plan card
- **Endpoints:**
  - test connection with the full error
  - duplicate
  - multi-select model import that marks models already added
- **Configuration:**
  - MCP live status, test all, failure details with copy, tool names
  - skill scaffold form (the desktop's SKILL.md)
- **Usage:**
  - endpoint and conversation filters
  - split chart by model, endpoint, or provider (bars or lines)
  - percentiles
  - chart CSV
  - tap a bar or heatmap cell to filter calls
  - paged, sortable call table
- **App:** Help links (documentation, report an issue).

### Phase 2 (new mux routes, `MUX_API_PHASE2.md`)

- **ask_user questions:**
  - options, multi-select, Other, Skip, and the timeout
  - in this screen's own runs and in mirrored runs (`ask_user` / `ask_user_resolved` frames)
  - flagged in the approvals inbox
- `/compact` and the auto-compaction notice.
- `/trust` with all, playbooks only, ignore, and reset.
- Background processes screen (`/processes`): list, live output, stop, stop all, clear finished.
- Web search providers screen (`/search`).
- The 2.0 settings fields, with localized hints.
- Keybindings screen: every command with its default and current chord, search, edit, unbind, reset.
- Live tool cards: arguments while running, then the result.
- Attached-files notice under the prompt, live and for saved turns.
- AI-generated titles refresh on `transcript_changed`.
