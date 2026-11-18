import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// The dev server proxies the API, the relay, and the WebSocket surfaces to a local Mux Cloud server so the
// dashboard runs on one origin, exactly as it does in production (app.usemux.ai serves the SPA itself).
const target = process.env.MUXCLOUD_DEV_SERVER ?? 'http://127.0.0.1:8800';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      '/v1.0': { target, changeOrigin: false, ws: true },
      '/m/': { target, changeOrigin: false, ws: true },
      '/openapi.json': { target, changeOrigin: false },
      '/swagger': { target, changeOrigin: false },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
