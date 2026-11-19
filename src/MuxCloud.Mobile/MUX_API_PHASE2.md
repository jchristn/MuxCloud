# Mux hub API for mobile parity (phase 2)

Contract for the mobile app's desktop-parity work. Everything here is on the machine's mux hub (Mux
`feature/v2.0.0`), reached through the Mux Cloud relay at `/m/{machineId}/...` exactly like the routes the app already
calls. All paths are under `/v1.0/api` unless shown in full.

Conventions:

- Response JSON uses PascalCase property names. Request bodies are read case-insensitively.
- Properties whose value is null may be omitted from responses (treat a missing property as null).
- List responses are `{ "Items": [ ... ], "Count": n }`.
- Errors are `{ "Error": "<Code>", "Message": "..." }` with the HTTP status.
- WebSocket (`/v1.0/ws`) frames use camelCase.

## 1. Chat stream additions (`POST /v1.0/api/chat/stream`)

Request body additions:

| Field | Type | Meaning |
|---|---|---|
| `AskUser` | bool | Send `true`. The run then streams `ask_user` questions and waits for an answer. Without it the model is told no user is available. |

SSE events (`event: <name>`, `data: <json>`), new or changed:

### `tool` (changed)

```json
{ "Id": "call_1", "Name": "read_file", "Status": "running", "ElapsedMs": 0, "Arguments": "{\"file_path\":\"notes.txt\"}", "ResultTruncated": false }
{ "Id": "call_1", "Name": "read_file", "Status": "ok", "ElapsedMs": 12, "Result": "file text...", "ResultTruncated": false }
```

- `Status`: `running`, `ok`, or `fail`.
- `Arguments`: raw JSON text, on the `running` event only.
- `Result`: on the finished event, truncated to 8000 characters (`ResultTruncated: true` when cut), the same as the
  desktop tool card.

### `attachments` (new; once per turn when the prompt has `@path` mentions)

```json
{
  "Attached": [ { "Path": "notes.txt", "Kind": "file", "Bytes": 19, "Lines": 1, "Inlined": true } ],
  "Skipped": [ { "Path": "@missing.txt", "Reason": "not found" } ],
  "Notes": [],
  "TotalBytes": 19
}
```

`Kind` is `file` or `directory`. `Notes` carries messages such as "mentions are turned off" or a size limit.

### `compacted` (new; when the run auto-compacts its context)

```json
{ "MessagesBefore": 25, "MessagesAfter": 9, "EstimatedTokensBefore": 41000, "EstimatedTokensAfter": 6000, "SummaryCreated": true, "Strategy": "summary", "Reason": "..." }
```

### `ask_user` (new; only when the request set `AskUser: true`)

```json
{
  "RunId": "8b2f...",
  "QuestionId": "q_3c1...",
  "Question": "Which database?",
  "Options": [ { "Label": "Postgres", "Description": "Server database" }, { "Label": "SQLite", "Description": "Embedded file" } ],
  "MultiSelect": false,
  "AllowOther": true,
  "AllowSkip": true,
  "TimeoutSeconds": 900
}
```

- The run waits for an answer. After `TimeoutSeconds` the question counts as unanswered and the model picks a default.
- `Options` has 2 to 4 entries.
- `AllowOther` and `AllowSkip` are always true: show a free-text field and a Skip button.

### Answering: `POST /v1.0/api/chat/answer`

```json
{ "RunId": "8b2f...", "QuestionId": "q_3c1...", "Answers": ["Postgres"], "Other": "keep SQLite for tests", "Skip": false }
```

- `200 { "ok": true }`. `404` when no question is pending (already answered or timed out). `400` without ids.
- `Answers` holds choice labels; send one unless `MultiSelect`. `Other` is free text and optional. `Skip: true` skips.
- Not gated by remote tool approval: questions have no side effects.
- A pending question also raises the Mux Cloud `approval_requested` machine status, so a push notification fires.

Unchanged events, for reference: `run` `{ RunId, SessionId }` (first), `token` (string), `thinking` (string),
`approval` `{ RunId, ToolCallId, Name, Arguments, ToolAutoApproveSeconds }`, `plan`
`{ plan, steps, text, executionPrompt }`, `done` `{ Role, Id, Content, Endpoint, Model, Stats }`, `canceled`, and
`error` (string).

### AI titles

Once a REST conversation passes 250 characters of content, the hub replaces the first-prompt title with an
AI-generated one in the background, then signals `transcript_changed` for the session. That signal goes to session
subscribers on `/v1.0/ws`, and the list refresh follows the usual `sessions_changed`. Reload the session or list to
show the new title.

## 2. WebSocket (`/v1.0/ws`) additions

Run frames:

```json
{ "contractVersion": "...", "eventType": "ask_user", "timestampUtc": "...", "runId": "8b2f...", "sessionId": "9f1c...", "questionId": "q_3c1...", "question": "Which database?", "options": [ { "label": "Postgres", "description": "..." } ], "multiSelect": false, "allowOther": true, "allowSkip": true, "timeoutSeconds": 900 }
{ "contractVersion": "...", "eventType": "ask_user_resolved", "timestampUtc": "...", "runId": "8b2f...", "sessionId": "9f1c...", "questionId": "q_3c1...", "dismissed": false }
```

Both are in the replay buffer. A run started on another surface that is waiting on a question therefore shows the
question to a session subscriber.

Client frame:

```json
{ "action": "answer", "runId": "8b2f...", "questionId": "q_3c1...", "answers": ["Postgres"], "other": null, "skip": false }
```

## 3. Runs

`GET /runs` items and `GET /runs/{runId}` add `PendingApprovalCount` and `PendingQuestionCount`. `Status` is one of
`running`, `awaiting_approval`, `completed`, `failed`, or `canceled`; it reads `awaiting_approval` while an approval
or a question is pending, which is the "needs you" dot on a conversation.

`GET /runs/{runId}` (verified, full shape):

```json
{
  "RunId": "...", "SessionId": "...", "EndpointName": "...", "Model": "...", "Status": "running", "IsTerminal": false,
  "StartedUtc": "...", "CompletedUtc": null, "IterationsCompleted": 2, "ToolCallCount": 3, "ErrorCount": 0,
  "InputTokens": 1200, "OutputTokens": 300, "TotalTokens": 1500, "FinalEstimatedTokens": 5400,
  "CurrentToolName": "read_file", "LastError": null, "TotalTaskCount": 3, "CompletedTaskCount": 1,
  "Tasks": [ { "Id": "1", "Title": "Read the config", "Status": "completed" } ],
  "PendingApprovalCount": 0, "PendingQuestionCount": 0
}
```

- Task `Status` is `pending`, `in_progress`, `completed`, `failed`, `skipped`, or `blocked`.
- Context meter: `FinalEstimatedTokens` divided by the endpoint's `ContextWindow`, from `GET /endpoints/detail`.
  `FinalEstimatedTokens` is set when the run ends.

## 4. Sessions: manual compaction

`POST /sessions/{id}/compact`. The body is optional: `{ "Endpoint": "<name>" }`. The default is the session's
endpoint, then the default endpoint.

```json
{ "Compacted": true, "Message": "...", "Endpoint": "ollama-local", "MessagesBefore": 30, "MessagesAfter": 9, "EstimatedTokensBefore": 21000, "EstimatedTokensAfter": 4200, "ContextWindow": 32768 }
```

| Status | Meaning |
|---|---|
| `200` | Done. `Compacted: false` with a `Message` when there is nothing to compact. |
| `404` | Unknown session. |
| `409` | A run for the session is in progress. |
| `502` | The model failed (`Error: CompactionFailed`). |

Viewers get `transcript_changed`.

## 5. Background processes

| Route | Result |
|---|---|
| `GET /processes` | `{ Items: [ { Id, Name, Command, WorkingDirectory, ProcessId, StartedUtc, ExitedUtc, Running, ExitCode, StoppedByUser, OutputChars, UnreadChars } ], Count }` |
| `GET /processes/{id}/output?chars=4000` | `{ Id, Command, Text, Running, ExitCode }`. `chars` is 1 to 200000. `404` for an unknown id. |
| `POST /processes/{id}/stop` | `{ Id, Text, DroppedChars, Running, ExitCode, Matched, MatchText, TimedOut }`. The id `all` returns `{ Stopped: n }`. |
| `DELETE /processes` | `{ Removed: n }` (clears exited processes) |

## 6. Project trust

| Route | Body / Result |
|---|---|
| `GET /trust?workingDirectory=<dir>` | `{ WorkingDirectory, ProjectRoot, Level }`. `Level` is `all`, `playbooks`, `ignore`, or `unknown`. |
| `PUT /trust` | Body `{ "WorkingDirectory": "<dir>", "Level": "all" \| "playbooks" \| "ignore" \| "reset" }`. Returns the same shape. `400` for a bad directory or level. |

## 7. Web search providers

`GET /search`:

```json
{
  "Enabled": true, "AllowFallback": true,
  "Providers": [ { "Name": "tavily", "ProviderType": "tavily", "Endpoint": "", "ApiKeySet": true, "Enabled": true, "IsDefault": true, "TimeoutMs": 15000 } ],
  "ProviderTypes": ["tavily", "you"]
}
```

- `PUT /search` takes the same shape and replaces the whole configuration.
  - `ApiKey` is write-only. A blank or missing `ApiKey` keeps the key stored under the same provider name.
  - Providers left out are removed.
  - The first enabled provider becomes the default when none is marked.
  - `400` for a missing or duplicate name, or an unknown type. Returns the settings.
- `DELETE /search/providers/{name}` returns the settings, or `404`.

## 8. Settings

`GET`/`PUT /settings` gain:

| Field | Type | Notes |
|---|---|---|
| `SystemPromptPath` | string or null | |
| `MaxTokenBudget` | int or null | Null or 0 means none. |
| `ContextWindowSafetyMarginPercent` | int | 5 to 50 |
| `TokenEstimationRatio` | number | 2.0 to 6.0 |
| `SkillRefreshIntervalSeconds` | int | |
| `SkillsDirectory` | string or null | |
| `TelemetryEnabled` | bool | |

`PUT /settings` now merges. Send only the fields you change; omitted fields keep their values. `Rest` and `Cloud` are
merged field by field.

## 9. Keybindings

`GET /keybindings/commands`:

```json
{ "Items": [ { "CommandId": "mux.save", "Title": "Save session", "Category": "Session", "DefaultChord": "ctrl+s", "EffectiveChord": "ctrl+s", "Overridden": false } ], "Count": 27 }
```

- `EffectiveChord` is null or omitted when the command is unbound.
- Save overrides with the existing `PUT /keybindings` and `{ "Items": [ { "CommandId", "Chord" } ] }`.
  - A blank `Chord` unbinds.
  - Sending the default chord resets: an override equal to the default is dropped.

## 10. Existing routes (verified through the relay)

| Route | Request | Result |
|---|---|---|
| `GET /context/instructions?workingDirectory=<dir>` | | `{ WorkingDirectory, Enabled, Sources, DroppedSources, TotalBytes, Truncated, Text }` |
| `POST /context/file` | `{ Path, Content, Mode?, EndpointName?, InlineThresholdBytes?, HeadLines?, SummaryChunkLines? }` | `{ Text, Mode, Inlined, OutlineEntryCount, FromCache }` |
| `GET /files/complete?workingDirectory=<dir>&prefix=<text>&max=20` | | `{ WorkingDirectory, Prefix, Paths, Mentions }`. Directories end with `/`. `Mentions` are quoted when needed. |
| `GET /usage/timeseries/split?dimension=model\|endpoint\|provider\|command\|callkind&top=6&range=day` (plus the usual filters) | | `{ Items: [ { Key, IsOther, Buckets: [ { BucketStartUnixMs, Metrics } ] } ], Count }` |
| `GET /memory?workingDirectory=<dir>&query=<words>&name=<name>` | | `{ WorkingDirectory, ProjectKey, Enabled, Memories: [ { Name, Scope, Description, Content, CreatedUtc, UpdatedUtc } ] }` |
| `POST /memory` | `{ Name, Description, Content, Scope: "project" \| "global", WorkingDirectory }` | `201` created or `200` updated, with the memory |
| `DELETE /memory?name=<n>&scope=<s>&workingDirectory=<dir>` | | The deleted memory, or `404` |
| `GET /worktrees?workingDirectory=<dir>` | | `{ Items: [ WorktreeInfo ], Count }`. `400` outside git. |
| `POST /worktrees/prune?workingDirectory=<dir>` | | `{ Items: [ "<removed name>" ], Count }` |
| `DELETE /worktrees?name=<n>&force=<bool>&keepBranch=<bool>&workingDirectory=<dir>` | | `200` with the removed worktree, `404`, or `409` |
| `GET /checkpoints?workingDirectory=<dir>` | | `{ WorkingDirectory, IsRepository, CanUndo, CanRedo }` |
| `POST /checkpoints/undo`, `POST /checkpoints/redo` | `{ "WorkingDirectory": "<dir>" }` | `{ Restored, Label, CanUndo, CanRedo }` |
| `POST /model/load` | `{ "Endpoint": "<name>", "Messages": [] }` | `{ Ok, Reachable, Error }` |

Notes:

- `Restored` is false when there is nothing to undo or the folder is not a git repository.
- Every chat turn records a checkpoint before it runs, in git repositories only, so undo reverts the last turn's file
  changes.
- `POST /model/load` gives the ready/unreachable indicator.
