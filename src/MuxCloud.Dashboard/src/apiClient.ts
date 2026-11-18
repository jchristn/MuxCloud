import { ApiClient } from './api';
import { i18next } from './i18n/runtime';

/** The dashboard's single API client: same origin, session cookie, active locale as Accept-Language. */
export const api = new ApiClient({
  baseUrl: '',
  authMode: 'cookie',
  getLocale: () => i18next.language || null,
});
