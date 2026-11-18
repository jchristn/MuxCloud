# Mux Cloud: agent instructions

Mux Cloud is the hosted relay that lets a developer use the mux agents on their own machines from a browser or
phone. Read `PLAN.md` first: it holds the architecture and every decision made with the owner. The tunnel protocol
reference is `WEBSOCKETS_API.md`; the REST reference is `REST_API.md`.

## Rules that are easy to miss

- **Parity rule.** A Mux Cloud user interacts with mux on a remote machine exactly as if they were at the machine.
  The relay never blocks, masks, or rewrites what the machine's own API returns. The only remote-specific control is
  the machine's `cloud.allowRemoteToolApproval` switch.
- **The cloud never stores conversation content.** Relay routes are excluded from request-history body capture.
  Push notifications carry no content.
- **Versions.** Never change a version number unless the owner explicitly asks (`~/Code/Agents/requirements/VERSIONING.md`).
  0.x releases are alpha.
- **No em-dashes anywhere**: code, comments, docs, Postman descriptions, commit messages.
- **Git.** Commit and push at each green milestone: MuxCloud on `main`. Mux changes go only on the Mux branch
  `feature/v2.0.0`, never Mux `main`, until validated end to end.
- **Loopback** is `127.0.0.1`, never `localhost`, in binds, clients, tests, SDKs, and health probes.

## Code style (strict)

Follows `~/Code/Agents/requirements/CODE_STYLE.md` and `BACKEND_ARCHITECTURE.md`:

- Namespace first; `using` directives inside the namespace, System usings first, alphabetical.
- XML documentation on every public member (warnings are errors), none on private members. Document defaults,
  ranges, nullability, thread safety, and thrown exceptions.
- Private fields `_PascalCase`. No `var`. No tuples. One class or enum per file. No partial classes.
- Public properties needing validation use backing fields with null checks and `Math.Clamp`.
- Every async method takes a `CancellationToken` and every await uses `.ConfigureAwait(false)`.
- Specific exception types with contextual messages; no `Console.WriteLine` in library code.
- Hand-written, provider-specific SQL (Sqlite, Postgresql, Mysql, SqlServer); no ORM; no JSON blob columns.
- IDs are PrettyId k-sortable strings with prefixes from `Constants.cs`.

## Build and test

```
dotnet build src/MuxCloud.sln
dotnet run --project src/Test.Automated --framework net10.0
dotnet test src/Test.Xunit3
dotnet test src/Test.Nunit
```

All suites live in `src/Test.Shared` and are listed in `MuxCloudSuites.All`. Suite and case identifiers use letters,
digits, `_`, and `-` only.
