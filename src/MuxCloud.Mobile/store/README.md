# Store screenshots and graphics

Assets for the App Store and Google Play listings of Mux AI (see `../APP_STORE_SUBMISSION.md`, section 7).
Captured 2026-11-19 from Release builds of the app against a local, throwaway Mux Cloud with three demo machines
(`studio-mac`, `build-box`, `travel-laptop`) under a demo account. No real account, machine, path, or key appears.
Status bars use the standard 9:41 demo values.

The sign-in shots show the app's default server, `https://app.usemux.ai`. The usage shots come from about 30 days of
synthetic history (3,167 model calls across five models and three endpoints) written to the demo hub's usage store in
mux's own format.

All screenshots are 24-bit PNG (no alpha), as App Store Connect and Google Play require.

## App Store: iPhone 6.9" (`ios-6.9/`, 1320 x 2868, iPhone 18 Pro Max simulator)

| File | Shows |
|---|---|
| `01-signin.png` | Sign-in screen with the wordmark, server `https://app.usemux.ai` |
| `02-machines.png` | Machines list: 2 of 3 online, `studio-mac` with 1 waiting and 1 running, `travel-laptop` offline |
| `03-conversation.png` | A conversation answering a question with a curl code block |
| `04-approval.png` | Tool approval card: "Allow mux to use edit_file?" with Approve, Approve for session, Deny |
| `05-new-conversation.png` | New conversation: endpoint and model, working folder picker |
| `06-usage.png` | Usage for the last month, tokens split by model, latency percentiles |
| `07-manage.png` | Manage menu (settings, prompts, skills, memory, worktrees, usage, and more) |
| `08-dark-conversation.png` | The conversation from 03 in dark mode |

## App Store: iPad 13" (`ipad-13/`, 2064 x 2752, iPad Pro 13-inch simulator)

| File | Shows |
|---|---|
| `01-signin.png` | Sign-in screen, email prefilled, server `https://app.usemux.ai` |
| `02-machines.png` | Machines list |
| `03-split-view.png` | Split view: machine and conversation list on the left, the curl conversation on the right |
| `04-approval.png` | Tool approval card with the three actions |
| `05-usage.png` | Usage for the last month: totals, tokens split by model, latency, breakdown by model |
| `06-dark-split-view.png` | Split view in dark mode on `build-box` |

## Google Play: phone (`android-phone/`, 1080 x 2160, Pixel 9 emulator with the display set to 1080 x 2160)

| File | Shows |
|---|---|
| `01-signin.png` | Sign-in screen, email prefilled, server `https://app.usemux.ai` |
| `02-machines.png` | Machines list |
| `03-conversation.png` | The curl conversation with its code block |
| `04-approval.png` | Tool approval card |
| `05-approvals.png` | Approvals inbox |
| `06-new-conversation.png` | New conversation with the folder picker |
| `07-dark-usage.png` | Usage for the last month in dark mode, tokens split by model, latency percentiles |

1080 x 2160 keeps the long side at most twice the short side, which Google Play requires.

## Google Play: 10" tablet (`android-tablet/`, 2560 x 1600, Pixel Tablet emulator)

| File | Shows |
|---|---|
| `01-signin.png` | Sign-in screen, email prefilled, server `https://app.usemux.ai` |
| `02-machines.png` | Machines list |
| `03-split-view.png` | Split view with the curl conversation |
| `04-approval.png` | Tool approval card |
| `05-usage.png` | Usage for the last month, tokens split by model, latency percentiles |
| `06-dark-split-view.png` | Split view in dark mode on `build-box` |

## Google Play graphics

| File | Size | Shows |
|---|---|---|
| `feature-graphic.png` | 1024 x 500, 24-bit | Navy gradient, the green mux wordmark, and "Your coding agent, anywhere"; content kept to the center |
| `play-icon-512.png` | 512 x 512, 32-bit | The app icon (`../assets/images/icon.png`) at 512 |

The feature graphic was rendered from HTML with Playwright (gradient from rgb(30,41,59) to rgb(8,13,26), wordmark from
`assets/logo-green-wordmark.png`).
