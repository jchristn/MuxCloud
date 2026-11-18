// What the Mux Cloud mobile app shares with this dashboard. One list, read by ESLint here and by the mobile app's
// Metro, Jest, and TypeScript configuration.
//
// Shared: every non-test module under src/api, src/types, src/lib, and src/i18n/catalog. Shared modules must be host
// agnostic: no window, document, localStorage, sessionStorage, navigator, location, import.meta, react-dom, or
// react-router. Dashboard-only code lives everywhere else (components, context, pages, i18n/runtime.ts).
const path = require('path');

const dashboardSrc = path.resolve(__dirname, 'src');
const sharedDirs = ['api', 'types', 'lib', 'i18n/catalog'];

module.exports = { dashboardSrc, sharedDirs };
