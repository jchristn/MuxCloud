// The sharing contract (sharing.config.cjs): shared modules must be host agnostic.
const BROWSER_GLOBALS = [
  'window',
  'document',
  'localStorage',
  'sessionStorage',
  'navigator',
  'location',
  'history',
  'DOMException',
  'HTMLElement',
  'MutationObserver',
  'requestAnimationFrame',
];

module.exports = {
  rules: {
    'no-restricted-globals': [
      'error',
      ...BROWSER_GLOBALS.map((name) => ({
        name,
        message: name + ' is a browser global; shared modules must be host agnostic (see sharing.config.cjs).',
      })),
    ],
    'no-restricted-syntax': [
      'error',
      {
        selector: "MetaProperty[meta.name='import'][property.name='meta']",
        message: 'import.meta is bundler-specific; pass configuration in through ApiClientOptions or parameters.',
      },
    ],
    'no-restricted-imports': [
      'error',
      {
        paths: [
          { name: 'react-dom', message: 'Shared modules must not depend on react-dom.' },
          { name: 'react-router', message: 'Shared modules must not depend on the dashboard router.' },
          { name: 'react', message: 'Shared modules are framework free.' },
          { name: 'i18next', message: 'Shared catalogs are data; the runtime lives in i18n/runtime.ts.' },
        ],
        patterns: [{ group: ['react-dom/*'], message: 'Shared modules must not depend on react-dom.' }],
      },
    ],
  },
};
