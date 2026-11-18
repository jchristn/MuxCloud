// ESLint (flat config): Expo's rules for the app, plus the host-agnostic contract.
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const globals = require('globals');
const shared = require('./eslint.shared.js');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'ios/*', 'android/*', '.expo/*', 'coverage/*', 'node_modules/*'],
  },
  {
    files: ['*.js', 'scripts/**/*.js'],
    languageOptions: { globals: { ...globals.node, ...globals.jest } },
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'import/no-unresolved': 'off',
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/**/__tests__/**'],
    rules: shared.rules,
  },
]);
