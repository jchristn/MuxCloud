# Testing Mux Cloud locally

This guide runs the whole system on one computer: the Mux Cloud server, its web dashboard, your own mux from the
`feature/v2.0.0` branch, and the mobile app in a simulator. Nothing here sends real email or touches the production
service at `https://app.usemux.ai`.

Ports used below: the cloud on `8760`, a test mux hub on `8771`. Your everyday mux (the tray agent on `8710`) is left
alone because every test mux command runs with its own `MUX_CONFIG_DIR`.

## 1. The automated end-to-end run (one command)

```bash
cd ~/Code/MuxCloud
scripts/e2e-real.sh
```

It builds the dashboard, the server, and mux (from `../Mux`, override with `MUX_REPO=/path/to/Mux`). Then it starts the
server on SQLite with the File email provider, plus a scripted model that streams replies and asks for a tool. Two real
mux hubs connect to the cloud, and Playwright drives the dashboard. It passes when every scenario below passes, and it
cleans up after itself. Set `E2E_KEEP=1` to keep the logs and data, or `E2E_SKIP_BUILD=1 E2E_WORKDIR=...` to rerun
without rebuilding.

| # | Scenario |
| --- | --- |
| 1 | Sign up in the dashboard, verify through the emailed link, sign in |
| 2 | `mux cloud login` connects a machine and it appears online live (no reload). A bearer client logs in, gets a WebSocket ticket, and hears `machine.online` on the events socket. A relayed `GET /m/{id}/v1.0/api/sessions` works. A stopped machine turns offline live, and the State filter shows only it |
| 3 | Open a machine and chat in its own mux dashboard through the relay. The reply arrives in several pieces as it streams |
| 4 | A tool call is approved remotely and runs. Another is denied remotely and does not run |
| 5 | A running reply is cancelled remotely |
| 6 | The Conversations page lists the conversation, and clicking it opens it on the machine (`?session=` deep link) |
| 7 | Rename and delete a conversation, and change a setting, all remotely. The machine keeps its API key, port, and cloud credential |
| 8 | With `mux cloud remote-approval off`, relayed approvals return 403 and relayed runs refuse the tool without prompting |
| 9 | A frozen machine (SIGSTOP) is evicted after missed heartbeats and shows offline. When it resumes, it reconnects and comes back online. A killed hub goes offline and a restarted one comes back |
| 10 | Request history records relay traffic without bodies or credentials |
| 11 | `mux cloud logout` on a machine revokes it in the cloud, and it leaves the list live |
| 12 | Revoking a machine in the dashboard closes its tunnel, and mux stops reconnecting and reports `Revoked` |

The scenarios live in `src/MuxCloud.Dashboard/tests/e2e-real/real.spec.ts`; the scripted model is
`scripts/e2e/fake-llm.py`.

## 2. Run the cloud from source by hand

Prerequisites: .NET 10 SDK, Node 22, and the two repositories side by side (`~/Code/MuxCloud`, `~/Code/Mux` on
`feature/v2.0.0`).

```bash
cd ~/Code/MuxCloud/src/MuxCloud.Dashboard
npm ci
npm run build                     # writes dist/, which the server serves at /

mkdir -p ~/muxcloud-local
cd ~/muxcloud-local                 # emails and logs are written under the current directory
MUXCLOUD_DB_TYPE=Sqlite \
MUXCLOUD_DB_FILENAME=$HOME/muxcloud-local/muxcloud.db \
MUXCLOUD_EMAIL_PROVIDER=File \
MUXCLOUD_PUBLIC_URL=http://127.0.0.1:8760 \
MUXCLOUD_REST_PORT=8760 \
MUXCLOUD_DASHBOARD_DIR=$HOME/Code/MuxCloud/src/MuxCloud.Dashboard/dist \
MUXCLOUD_ADMIN_PASSWORD='choose-an-admin-password' \
  dotnet run --project ~/Code/MuxCloud/src/MuxCloud.Server -f net10.0 -- --config ~/muxcloud-local/muxcloud.json
```

The first start writes `~/muxcloud-local/muxcloud.json` with defaults and a generated signing key, and seeds the
administrator `admin@muxcloud.local` with the password you passed. Leave it running.

Open `http://127.0.0.1:8760`, choose **Create an account**, and sign up. The verification email is written to
`~/muxcloud-local/email-outbox` instead of being sent (`Email.File.Directory` in `muxcloud.json`). Open the newest
`*verify_email*.html` file and click the link (or paste the `verify?token=...` URL into the browser), then sign in.

## 3. Run the cloud with Docker

```bash
cd ~/Code/MuxCloud
docker build -f docker/server/Dockerfile -t muxcloud-server:local .
mkdir -p ~/muxcloud-docker/email
docker run -d --name muxcloud -p 127.0.0.1:8760:8800 \
  -e MUXCLOUD_DB_TYPE=Sqlite -e MUXCLOUD_DB_FILENAME=/app/data/muxcloud.db \
  -e MUXCLOUD_EMAIL_PROVIDER=File -e MUXCLOUD_PUBLIC_URL=http://127.0.0.1:8760 \
  -e MUXCLOUD_ADMIN_PASSWORD='choose-an-admin-password' \
  -v ~/muxcloud-docker/email:/app/email-outbox \
  muxcloud-server:local
curl http://127.0.0.1:8760/v1.0/api/health
```

Verification emails land in `~/muxcloud-docker/email`. For the full stack with PostgreSQL, use
`docker/compose.yaml` (see `DOCKERHUB_README.md`). Stop with `docker rm -f muxcloud`.

## 4. Connect a mux machine

Use a separate config directory so your everyday mux is untouched:

```bash
cd ~/Code/Mux
git switch feature/v2.0.0
dotnet build src/Mux.Cli -f net10.0

export MUX_CONFIG_DIR=~/muxcloud-local/mux-test     # a test identity for this machine
alias muxdev="dotnet run --project ~/Code/Mux/src/Mux.Cli -f net10.0 --no-build --"

muxdev cloud login --server http://127.0.0.1:8760 --name test-box     # prompts for email and password
# The command shows the remote-access notice, then "Signed in as ...". The password is never stored.

# Give the test hub its own port, then start it. It opens the tunnel and keeps it open.
python3 -c "import json,os;p=os.path.expanduser('~/muxcloud-local/mux-test/settings.json');s=json.load(open(p));s['rest']['port']=8771;json.dump(s,open(p,'w'),indent=2)"
muxdev serve
```

In a second terminal (same `MUX_CONFIG_DIR`), `muxdev cloud status` shows `Mux Cloud : Connected`. In the dashboard,
**Machines** now lists `test-box` as online. Click it to use that machine's own mux dashboard through the cloud:
chat, approve tools, start conversations in any folder, and change settings, exactly as on the machine.

Other surfaces sign in the same way: `/cloud login` in the terminal UI, the Mux Cloud window in the desktop app, the
Mux Cloud panel in the local dashboard's Settings, and `mux: Connect to Mux Cloud` in VS Code. Each one asks for the
server URL, so enter `http://127.0.0.1:8760` there.

Useful commands:

| Command | Effect |
| --- | --- |
| `muxdev cloud status` | Connection state, server, machine, account, remote approval |
| `muxdev cloud remote-approval off` | Remote users can no longer approve tools that edit files or run commands |
| `muxdev cloud logout` | Revokes the machine in the cloud, then deletes the local credential |

Without a real model configured, chats fail with a model error. Point an endpoint at your usual provider in
`~/muxcloud-local/mux-test/endpoints.json`, or start the scripted one with
`python3 ~/Code/MuxCloud/scripts/e2e/fake-llm.py 8790` and use this `endpoints.json`:

```json
{ "endpoints": [ { "name": "fake", "adapterType": "openai-compatible", "baseUrl": "http://127.0.0.1:8790/v1",
  "model": "e2e-fake", "isDefault": true } ] }
```

Send `E2E_TOOL` to get a tool approval prompt, or `E2E_SLOW` for a long reply you can cancel.

## 5. The mobile app

```bash
cd ~/Code/MuxCloud/src/MuxCloud.Mobile
npm ci
npm run ios          # or: npm run android
```

On the sign-in screen choose **Change server** and enter `http://127.0.0.1:8760` (the iOS simulator reaches your
computer at 127.0.0.1; the Android emulator uses `http://10.0.2.2:8760`). A plain HTTP URL shows a warning, which is
expected locally. Sign in with the account from step 2.

For a physical phone on the same network, the server has to listen on your LAN address and accept it as an origin:

```bash
MUXCLOUD_REST_HOST=0.0.0.0 MUXCLOUD_PUBLIC_URL=http://192.168.1.20:8760 ...   # your computer's LAN address
```

and enter `http://192.168.1.20:8760` in the app.

**Shortcut for app work.** `src/MuxCloud.Mobile/scripts/dev-stack.sh` does steps 2 and 4 for the app: `start` runs the
cloud on `127.0.0.1:8760` (SQLite, File email, data in `$STACK_DIR`), `verify` prints the newest verification link,
`mux NAME ...` runs the mux CLI with that machine's own `MUX_CONFIG_DIR`, and `serve NAME PORT` / `unserve NAME` keep a
machine online or take it offline. Run `scripts/dev-stack.sh` with no arguments for the full usage, including the
enrollment commands. Set `MUXCLOUD_REPO` and `MUX_REPO` to worktrees when other work is in progress in your checkouts.

Previewing right-to-left in Expo Go: the in-app language choice cannot flip the layout direction in Expo Go, so start
Metro with `MUXCLOUD_MOBILE_FORCE_RTL=1 npx expo start` and pick Arabic in App settings. Real builds switch from the
in-app choice after a restart. Reviewed screenshots of the app against a local stack are in `docs/screenshots/mobile/`. Push notifications need an EAS project and credentials, so they are
off locally; the app says "This server does not send notifications yet" until they are configured.

## 6. Cleaning up

```bash
pkill -f "Mux.Cli serve"            # stops test hubs you started with muxdev serve
rm -rf ~/muxcloud-local ~/muxcloud-docker
docker rm -f muxcloud 2>/dev/null
```

Your everyday `~/.mux` configuration was never used.
