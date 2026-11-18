# Mux Cloud mobile app

The Mux app for iPhone, iPad, and Android phones and tablets. It shows the machines on your Mux Cloud account with live
online and offline state, and lets you use any of them exactly as if you were sitting at it: browse, search, and manage
conversations, chat with streaming replies, approve tools, start new conversations in any folder, and manage the
machine's endpoints, MCP servers, prompts, subagents, hooks, commands, keybindings, skills, usage, pricing, palettes,
and settings.

Expo (SDK 58) with React Native 0.88, React 19.3, expo-router, and TypeScript. Version 2.0.0, in step with Mux
Cloud.

## Running it

```
npm install
npm start            # Expo dev server; press i for the iOS simulator, a for Android
npm run verify       # typecheck, lint, i18n check, parity check, audit check, unit tests
npm run export:check # bundle for iOS and Android into dist/
```

The app talks to `https://app.usemux.ai` by default. For local development, change the server on the sign-in screen
("Change server") to your Mux Cloud server, for example `http://192.168.1.20:8800` (the simulator can use
`http://127.0.0.1:8800`). Plain HTTP shows a warning.

## How it connects

| What | How |
| --- | --- |
| Sign in | `POST /v1.0/api/auth/login` with `client: "mobile"`. The access and rotating refresh tokens live in the Keychain / Keystore (`expo-secure-store`, `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`), per server. One refresh runs at a time, before expiry and after a 401. |
| Machines | `GET /v1.0/api/machines`, kept live by `/v1.0/events` (single-use ticket from `POST /v1.0/api/ws-tickets`). |
| A machine's own API | Everything under `/m/{machineId}/v1.0/api/...` through the relay, with the same request and response bodies the local mux dashboard uses (`src/relay/muxApi.ts`). |
| Chat | `POST /m/{id}/v1.0/api/chat/stream`, read incrementally through `XMLHttpRequest` progress events (React Native's fetch has no body stream) and parsed by `src/lib/sse.ts`. |
| Live updates and approvals | `WS /m/{id}/v1.0/ws?ticket=...` subscribed by session: mirrored runs, `approval_requested` / `approval_resolved`, transcript changes. |
| Push | Expo push token registered with `POST /v1.0/api/devices` (see "Backend requirements"). |

## Shared code with the web dashboard

The app reuses the dashboard's host-agnostic modules instead of copying them (`sharing.config.js`):
`@dashboard/api` (API client and routes), `@dashboard/types` (DTOs), `@dashboard/lib` (events socket client,
formatters, machine and conversation helpers), and `@dashboard/i18n/catalog` (translations). Metro, Jest, and
TypeScript resolve the alias to `../MuxCloud.Dashboard/src`, and bare imports made from those files resolve from this
project. `npm run lint:shared` checks the shared files against the contract: no browser globals, no `import.meta`, no
framework imports.

The app's own strings are under `mobile.*` in `src/i18n/mobile/`, in all 12 locales plus the two pseudo-locales.
`npm run i18n:check` fails on a missing or orphan key, a dropped `{{interpolation}}`, or any literal key the code uses
that neither catalog defines.

## Parity

`parity.json` maps every feature of the mux local dashboard to a mobile screen. Each is `implemented`, or
`not-applicable` with a reason (for example, PNG chart export: use the system screenshot). `npm run parity:check`
fails on anything `planned`, on an implemented feature whose screen file is missing, and, when the mux repository sits
next to MuxCloud (or `MUX_REPO` is set), on any dashboard view the manifest does not cover. `npm run parity:update`
adds new dashboard views as `planned`.

## Layout

Phones use tabs (Machines, Conversations, Approvals, Account) with stacks. On tablets and wide windows (768 points and
up), a machine's screen shows its conversation list beside the selected conversation. Light and dark themes follow the
system unless chosen in App settings. Arabic and the RTL pseudo-locale switch the layout direction on the next launch.

## Backend requirements

Push notifications need two routes that are not in `REST_API.md` yet:

| Route | Body | Response |
| --- | --- | --- |
| `POST /v1.0/api/devices` | `{ "expoPushToken": "ExponentPushToken[...]", "platform": "ios" \| "android", "name": "Joel's iPhone" }` | `201 { "id": "dev_...", "platform": "ios", "name": "...", "createdUtc": "..." }`. Re-registering the same token for the same user returns the existing device. |
| `DELETE /v1.0/api/devices/{id}` | none | `204` |

The cloud sends a notification through the Expo Push API for `approval_requested` and `run_completed` machine status
pushes, to every device of the machine's user, with data `{ machineId, sessionId, runId, kind }` and no conversation
content. Until the routes exist the app shows "This server does not send notifications yet".

## Store distribution

Ships through TestFlight and Google Play internal testing first, then public listings (PLAN.md decision 5). Before the
first store build the owner needs:

1. The publisher is Lattice AI, LLC (organization accounts, D-U-N-S 143-463731), the same as BJJ with Joel: an Apple
   Developer Program organization membership (enrollment in progress; the Team ID goes in `eas.json`) and a Google Play
   Console organization account. Store copyright: `2026 Lattice AI, LLC`. Support address: `hello@latticetech.ai`.
2. The EAS project is `@joel-christner/mux` (ID `695bdade-ea51-48f9-9348-56acb235f711`, the default in
   `app.config.ts`; override with `MUXCLOUD_MOBILE_EAS_PROJECT_ID`). Expo holds the `GOOGLE_SERVICES_JSON` file variable
   and the Android FCM V1 key. CLI access uses an `EXPO_TOKEN` access token kept outside Git.
3. The app registered in App Store Connect and Play Console under bundle identifier and package `ai.usemux.app`
   (reverse of the usemux.ai domain plus `.app`, the same pattern as `com.bjjwithjoel.app`; override with
   `MUXCLOUD_MOBILE_BUNDLE_ID`). The EAS owner is `joel-christner` (override with `MUXCLOUD_MOBILE_EAS_OWNER`).
4. Push credentials: an APNs key in EAS for iOS, and for Android the Firebase project `mux-ai-52eb1`:
   `google-services.json` as the EAS file variable `GOOGLE_SERVICES_JSON` (local builds use a git-ignored
   `./google-services.json`) plus the FCM V1 service account key in EAS credentials.
5. The `submit` placeholders in `eas.json` filled in (Apple ID, App Store Connect app id, team id, Play service account
   key path).
6. Store listings with the privacy policy and account-deletion URLs (`https://app.usemux.ai/legal/privacy`,
   `/legal/account-deletion`); in-app account deletion is under Account, Delete account.

`eas.json` has `development` (simulator / APK), `preview` (TestFlight and Play internal track), and `production`
profiles. Nothing here builds or submits automatically.

## Dependency audit

`npm run audit:check` fails on any advisory not reviewed in `audit-allowlist.json`. The three listed today
(picomatch, minimatch, glob) are in build and test tooling only and never reach the app bundle.
