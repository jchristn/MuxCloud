// Lints the dashboard modules this app shares (sharing.config.js) against the sharing contract only: no browser
// globals, no import.meta, no framework imports. Run from this folder: npm run lint:shared
const path = require('path');
const { defineConfig } = require('eslint/config');
const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const shared = require('./eslint.shared.js');
const { sharedDirs } = require('./sharing.config');

const dashboard = path.join('MuxCloud.Dashboard', 'src');

module.exports = defineConfig([
  {
    basePath: dashboard,
    files: sharedDirs.map((d) => `${d}/**/*.ts`),
    ignores: ['**/*.test.ts', '**/*.test.tsx'],
    languageOptions: { parser: tsParser },
    plugins: { '@typescript-eslint': tsPlugin },
    linterOptions: { reportUnusedDisableDirectives: 'off' },
    rules: { ...shared.rules, ...shared.sharedOnlyRules },
  },
]);
