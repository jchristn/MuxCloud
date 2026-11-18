// Jest (jest-expo preset, React Native environment). Shared dashboard modules are imported through the same aliases
// Metro uses, and bare imports from them resolve from this project (jest.resolver.js).
const path = require('path');
const { sharedRoots } = require('./sharing.config');

const local = (name) => path.join(__dirname, 'node_modules', name);

module.exports = {
  preset: 'jest-expo/ios',
  setupFiles: ['<rootDir>/jest.setup.js'],
  resolver: '<rootDir>/jest.resolver.js',
  roots: ['<rootDir>/src', '<rootDir>/scripts'],
  testMatch: ['**/__tests__/**/*.test.ts?(x)'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@dashboard/(.*)$': path.join(sharedRoots.dashboardSrc, '$1'),
    '^react$': local('react'),
    '^react/(.*)$': local('react') + '/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|react-native-.*|@react-native-async-storage/.*|marked))',
  ],
  clearMocks: true,
  testTimeout: 60000,
};
