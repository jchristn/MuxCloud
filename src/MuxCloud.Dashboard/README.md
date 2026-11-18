# Mux Cloud dashboard

The web dashboard for Mux Cloud: sign up and sign in, see every machine connected to the account with live status,
open a machine to use its own mux dashboard through the relay, browse conversations across machines, manage the
account and plan, and (for system administrators) operate the server.

React 19, Vite, React Router 7, TypeScript, i18next. No UI kit and no charting library.

## Running

```
npm install
npm run dev        # http://127.0.0.1:5173, proxies /v1.0, /m, /openapi.json, /swagger to the server
npm run build      # writes dist/, which the Mux Cloud server serves with SPA fallback
```

The dev server proxies to `http://127.0.0.1:8800` by default. Set `MUXCLOUD_DEV_SERVER` to point elsewhere.

The dashboard always runs on the same origin as the API: the server serves `dist/`. The browser authenticates with
the HttpOnly `muxcloud_session` cookie, which also covers the relayed machine dashboard framed at
`/m/{machineId}/dashboard` and the WebSocket upgrades.

## Tests

```
npm test           # i18n gate (scripts/check-i18n.mjs) and vitest unit tests
npm run test:e2e   # Playwright: functional flows plus visual checks at 1280, 768, and 390 px, light and dark
npm run lint
npm run typecheck
```

Playwright runs against `vite preview` with every API and WebSocket call mocked (`tests/mockServer.ts`). Set
`MUXCLOUD_E2E_BASE_URL` to run against a live server instead. Screenshots land in `test-results/screens/`.

The i18n gate fails when a locale is missing a key, has an extra key, changes an `{{interpolation}}` or `<tag>`, has an
empty value, when source code references an unknown key, when an English key is unused, or when JSX contains
hard-coded text.

## Shared modules (mobile app)

The Expo app reuses these folders unchanged (`sharing.config.cjs` is the list):

| Folder             | Contents                                                                                                                                                                           |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/api`          | `ApiClient` (cookie mode for the browser, bearer mode with refresh for mobile), `ApiError`, typed functions for every route in REST_API.md                                         |
| `src/types`        | REST DTOs, account events, and the mux session shapes returned through the relay                                                                                                   |
| `src/lib`          | Locale-explicit formatters, the events socket client (injectable socket factory and timers), machine and conversation helpers, activity chart ranges, paging math, OpenAPI helpers |
| `src/i18n/catalog` | Locale registry, English source, 11 translations, pseudo-locales                                                                                                                   |

Shared modules must not use `window`, `document`, `localStorage`, `navigator`, `import.meta`, `react`, `react-dom`,
`react-router`, or the i18next runtime. ESLint enforces this (`eslint.shared.cjs`).

## Locales

English (source), Spanish, Portuguese, French, Italian, German, Mandarin Chinese, Arabic (right to left), Russian,
Malay, Hindi, and Japanese. Test pseudo-locales `qps-ploc` (expansion) and `qps-rtl` appear in the picker after
visiting any page with `?pseudo=1`. Translations are machine-drafted and need native review before general
availability. Legal documents are published in English only.

## Dependencies and audit

`npm audit --omit=dev` reports no vulnerabilities. The development toolchain (Vite, Vitest, typescript-eslint) pulls
`picomatch` 4.0.7, which has an open ReDoS advisory (GHSA-fc5q-39xc-vjpf) with no patched release. It only runs on
developer machines and in CI against our own glob patterns, never in the shipped bundle.

See [ROUTES.md](ROUTES.md) for the route inventory.
