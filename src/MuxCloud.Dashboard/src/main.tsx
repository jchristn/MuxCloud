import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { initI18n } from './i18n/runtime';
import { App } from './App';
import './index.css';

initI18n();

// After a redeploy, a tab still running the previous build asks for chunk files that no longer exist. Reload once to
// pick up the new build; the timestamp guard stops a reload loop if the chunk is missing for another reason.
window.addEventListener('vite:preloadError', (event) => {
  try {
    const last = Number(sessionStorage.getItem('muxcloud.staleReload') ?? '0');
    if (Date.now() - last < 30_000) return;
    sessionStorage.setItem('muxcloud.staleReload', String(Date.now()));
  } catch {
    return;
  }
  event.preventDefault();
  window.location.reload();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
