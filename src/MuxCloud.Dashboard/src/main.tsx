import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { initI18n } from './i18n/runtime';
import { App } from './App';
import './index.css';

initI18n();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
