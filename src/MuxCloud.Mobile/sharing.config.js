// What the mobile app shares with the Mux Cloud web dashboard. One list, read by Metro, Jest, TypeScript (via
// tsconfig paths), and ESLint (eslint.dashboard-shared.config.js).
//
// Shared: every non-test module under the dashboard's src/api, src/types, src/lib, and src/i18n/catalog, as declared by
// the dashboard's own sharing.config.cjs. Shared modules are host agnostic and framework free: no window, document,
// localStorage, navigator, import.meta, react, or react-dom. The app imports them as `@dashboard/api`,
// `@dashboard/types`, `@dashboard/lib`, and `@dashboard/i18n/catalog`.
const path = require('path');

const dashboardSrc = path.resolve(__dirname, '..', 'MuxCloud.Dashboard', 'src');
const sharedDirs = ['api', 'types', 'lib', 'i18n/catalog'];

module.exports = { sharedRoots: { dashboardSrc }, sharedDirs };
