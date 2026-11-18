import { defineConfig, devices } from '@playwright/test';

// Functional and visual checks. By default the built dashboard is served by `vite preview` and every API and
// WebSocket call is mocked (tests/mockServer.ts). Set MUXCLOUD_E2E_BASE_URL to run against a live server instead.
const baseURL = process.env.MUXCLOUD_E2E_BASE_URL ?? 'http://127.0.0.1:4173';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  fullyParallel: true,
  reporter: [['list']],
  use: { baseURL, trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.MUXCLOUD_E2E_BASE_URL
    ? undefined
    : {
        command: 'npx vite preview --host 127.0.0.1 --port 4173 --strictPort',
        url: baseURL,
        reuseExistingServer: true,
        timeout: 60_000,
      },
});
