import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const shared = require('./eslint.shared.cjs');
const { sharedDirs } = require('./sharing.config.cjs');

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'playwright-report', 'test-results'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: { ecmaVersion: 2023, globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    // The sharing contract: these folders are reused by the mobile app.
    files: sharedDirs.map((dir) => 'src/' + dir + '/**/*.ts'),
    ignores: ['**/*.test.ts'],
    rules: shared.rules,
  },
  {
    files: ['scripts/**/*.mjs', 'vite.config.ts', 'playwright.config.ts', 'tests/**/*.ts', '*.cjs'],
    languageOptions: { globals: globals.node },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
);
