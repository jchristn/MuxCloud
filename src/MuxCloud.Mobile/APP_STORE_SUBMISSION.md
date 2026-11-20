# App Store and Google Play submission

Everything needed to submit the Mux mobile app (`src/MuxCloud.Mobile`) to App Store Connect and the Google Play
Console, published by Lattice AI, LLC. Values in `[PLACEHOLDER: ...]` are for the owner to fill in. Never put
passwords or keys in this file.

## 0. Before the first submission

- [ ] Apple Developer Program (Lattice AI, organization): enrollment approved; Team ID in `eas.json`.
- [x] Google Play Console (Lattice AI, organization, trader under the EU DSA); app **Mux** created.
- [x] Expo project `@joel-christner/mux`; Android FCM V1 key and Play submission key stored in Expo.
- [ ] Apple APNs key added to Expo (after the Team ID).
- [ ] App record created in App Store Connect for `ai.usemux.app`.
- [x] Legal pages final (no `[PLACEHOLDER]` left) at `https://app.usemux.ai/legal/terms`, `/legal/privacy`,
      `/legal/account-deletion` (2026-11-19).
- [x] Reviewer demo account and an always-online demo machine (section 8). Without a connected machine the app shows an
      empty list, which reviewers reject as incomplete (Apple 2.1 and 4.2, Play "Minimum functionality").
- [ ] Store screenshots (section 7) and the Google Play feature graphic.
- [ ] First Android upload done by hand to internal testing (Google requires it); later uploads use `eas submit`.

## 1. App information

| Field | Value |
|---|---|
| Bundle ID / package | `ai.usemux.app` |
| App Store name (30 max) | `Mux AI` |
| Home screen name | `Mux` |
| App Store subtitle (30 max) | `Your coding agent, anywhere` |
| Google Play title (30 max) | `Mux AI: coding agent` |
| Primary category | Developer Tools (App Store); Tools (Google Play) |
| Secondary category | Productivity (App Store) |
| Price | Free |
| In-app purchases | None |
| Copyright | 2026 Lattice AI, LLC |
| Support URL | `https://usemux.ai` |
| Marketing URL | `https://usemux.ai` |
| Privacy policy URL | `https://app.usemux.ai/legal/privacy` |
| Account deletion URL | `https://app.usemux.ai/legal/account-deletion` |
| Support email | `hello@latticetech.ai` |
| Google Play contact phone (optional) | [PLACEHOLDER] |

Name: the store name is **Mux AI** (chosen 2026-11-19). "Mux" alone is also a video company (mux.com), so check
App Store Connect and Play Console for "Mux AI" before submitting. Mux Cloud remains the name of the service the app
connects to.

## 2. Store copy

All copy is plain, no em-dashes, and claims only what the app does today.

### 2.1 App Store promotional text (170 max; can change without a new build)

> Run mux on your own computers and pick up from your phone. See every machine, continue any conversation, approve
> tools, and get notified when a run finishes.

### 2.2 Short description (Google Play, 80 max)

> Use your mux coding agent from your phone: conversations, approvals, and more.

### 2.3 Full description (App Store and Google Play, 4000 max)

```
Mux AI puts your mux coding agent in your pocket.

mux is an open-source AI coding agent that runs on your own computers, with the models you choose. Mux Cloud connects
those computers to your account so you can keep working from anywhere. This app is the phone and tablet side of it.

PICK UP WHERE YOU LEFT OFF
- See all your machines and which are online, busy, or waiting on you.
- Open any conversation and keep going, or start a new one in any folder.
- Watch replies stream in live, including runs you started on another device.

STAY IN CONTROL
- Approve or deny the commands and file edits mux wants to make, from anywhere.
- Answer the questions mux asks while it works.
- Undo a turn's file changes, stop a run, or switch models mid-conversation.
- Get a notification when a run needs you or finishes.

EVERYTHING YOU HAVE AT YOUR DESK
- Endpoints and models, MCP servers, prompts, subagents, hooks, commands, and skills.
- Memory, worktrees, processes, and project trust.
- Usage and cost dashboards with filters, percentiles, and exports.
- Plan mode, slash commands, @file mentions, and conversation stats.

YOUR CODE STAYS ON YOUR MACHINES
Mux Cloud relays your conversations between this app and your computer. It does not store your code or your
conversations. Each machine decides whether tools can be approved remotely, and you can turn that off on the machine
at any time.

HOW TO START
1. Install mux on your computer (https://github.com/jchristn/Mux).
2. Create a free Mux Cloud account at app.usemux.ai or in this app.
3. On the computer, run "mux cloud login" (or use Connect to Mux Cloud in the desktop app, dashboard, or VS Code).
4. Open this app and sign in. Your machine appears within seconds.

Also included: Face ID or fingerprint lock, light and dark themes, tablet split view, and 12 languages.

Mux Cloud is made by Lattice AI, LLC. mux is open source under the MIT license.
```

### 2.4 Keywords (App Store, 100 characters, comma separated, no spaces)

```
ai,coding,agent,developer,code,terminal,llm,ollama,openai,claude,remote,devtools,programming,cli
```

Check the final string is at most 100 characters in App Store Connect; drop `cli` first if it is over.

### 2.5 What's new (first release)

> First release of Mux AI for iPhone, iPad, and Android.

### 2.6 Review notes (App Store Connect "Notes"; Play Console "App access")

```
Mux AI is the mobile client for mux, an open-source coding agent that runs on the user's own computer. The app
shows the user's connected computers ("machines") and lets them use mux on them remotely.

A demo account with an always-online demo machine is provided:
  Email: user@reviewer.com
  Password: (entered in the console's sign-in credentials field)

To try it:
1. Sign in with the demo account. The machine "demo" appears as Online.
2. Tap "demo", then "New conversation", and send a message such as "Explain what a to-do list app is."
3. The reply streams in from the demo machine's small local model. Open the conversation list, the Manage menu
   (endpoints, prompts, skills, usage), and the Account tab to see the rest of the app.

The app has no in-app purchases. Accounts can be deleted in the app under Account, Delete account, or at
https://app.usemux.ai/legal/account-deletion.
```

## 3. Age rating

The Terms require users to be 18 or older; the app contains no user-generated social content, no ads, no gambling,
and no mature themes. It does show text the user's own AI model generates.

- App Store: answer **None** to every content question; "Unrestricted web access": **No**; the result is **4+**.
  Optionally choose 17+ to align with the Terms' age requirement (recommended, since the Terms say 18+ and model output
  is not filtered).
- Google Play (IARC): category **Utility, Productivity, Communication, or Other**; violence, sexuality, language,
  controlled substances, gambling: **No**; "Does the app allow users to interact or exchange content": **No** (each
  user sees only their own machines). Target audience: **18 and over**.

## 4. Apple App Privacy (nutrition label)

Tracking: **No.** No advertising, analytics, or crash-reporting SDK is included. Data is not linked with third-party
data or shared with data brokers.

| Data type | Collected | Linked to user | Purpose |
|---|---|---|---|
| Contact info: Email address | Yes | Yes | App Functionality (sign-in, account email) |
| Contact info: Name | Yes (optional) | Yes | App Functionality |
| Identifiers: Device ID | Yes (push token) | Yes | App Functionality (notifications) |
| Usage data: Product interaction | No | | |
| Diagnostics | No (no crash reporting) | | |
| User content: Other user content | No (conversations are relayed, not stored) | | |

The server keeps security and audit records (sign-ins, IP addresses) and API request history without bodies; these
are covered by "App Functionality" and the privacy policy.

## 5. Google Play Data safety

| Question | Answer |
|---|---|
| Does the app collect or share user data? | Collects; does not share |
| Encrypted in transit | Yes (HTTPS) |
| Users can request deletion | Yes (in app, and at the account deletion URL) |
| Personal info: Email address | Collected, required, App functionality, Account management |
| Personal info: Name | Collected, optional, App functionality |
| Device or other IDs | Collected (push token), App functionality |
| Messages, photos, files, location, contacts, financial, health | Not collected |
| App activity, app info and performance | Not collected |

Conversations pass through Mux Cloud between the app and the user's machine and are not stored, so they are not
"collected" under Play's definition. Say so in the free-text notes if asked.

## 6. Account deletion

In the app: Account, Delete account (asks for the password, deletes the account, its machines, sessions, and devices).
Web: `https://app.usemux.ai/legal/account-deletion` explains both ways and names the app and Lattice AI, LLC.

## 7. Screenshot plan

| Store | Device | Size | Count |
|---|---|---|---|
| App Store | iPhone 6.9" (iPhone 18 Pro Max simulator) | 1320 x 2868 | 5 to 8 |
| App Store | iPad 13" (iPad Pro 13-inch simulator) | 2064 x 2752 | 5 |
| Google Play | Phone | 1080 x 1920 or larger | 4 to 8 |
| Google Play | 10" tablet (Pixel Tablet emulator) | 2560 x 1600 | 4 |
| Google Play | Feature graphic | 1024 x 500 | 1 |
| Google Play | App icon | 512 x 512 | 1 |

Screens, in order: machines list (two online, one offline), a conversation streaming a reply, a tool approval card,
the approvals inbox, new conversation with folder picker, usage dashboard, Manage menu, tablet split view. Use the
demo account and demo machine so no personal data appears; light mode for most, one dark.

## 8. Reviewer demo account and machine

Set up 2026-11-19 and verified end to end through Mux Cloud.

| Item | Value |
|---|---|
| Account | `user@reviewer.com` (password in the private ops folder; email verified by an administrator) |
| Machine | `demo` (`mch_mwnuk3ch_gtKHDQQn5JUHnCBqVNQ`), remote tool approval on |
| Where | Docker on the Mux Cloud EC2 host, project `muxdemo` in `~/muxdemo` (repo: `docker/demo/`) |
| Model | `gemma3:1b` in an `ollama/ollama:0.40.13` container (CPU; no ports published) |
| Workspace | `docker/demo/workspace` (a tiny sample to-do project) |

Gemma 3 models do not support tool calling, so mux sends their turns without tools: reviewers see streaming replies,
conversations, and every management screen, but no tool approval card. The approval flow can be shown in the
screenshots instead (taken against a tool-capable model).

Operations (on the host):

```
cd ~/muxdemo
docker compose ps
docker compose exec mux-demo mux cloud status
docker compose restart mux-demo
```

The containers restart with Docker, which starts on boot. Rebuild the hub image after mux changes with
`docker buildx build --builder cloud-jchristn77-jchristn77 --platform linux/amd64 --load -t muxcloud-demo-mux:local
-f docker/demo/mux.Dockerfile <clean Mux export>`, then `docker save | ssh ... docker load` and `docker compose up -d`.

## 9. Build and submit

```
cd src/MuxCloud.Mobile
# Android (Play internal testing; first upload by hand, then):
npx eas-cli build -p android --profile production
npx eas-cli submit -p android --profile preview      # internal track, draft
# iOS (after the Team ID and APNs key):
npx eas-cli build -p ios --profile production
npx eas-cli submit -p ios --profile production       # TestFlight
```

Build numbers (`ios.buildNumber`, `android.versionCode` in `app.config.ts`) must increase for every store upload; the
marketing version stays 2.0.0.
