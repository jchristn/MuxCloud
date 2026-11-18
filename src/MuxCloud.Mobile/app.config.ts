import type { ConfigContext, ExpoConfig } from 'expo/config';

// ---------------------------------------------------------------------------------------------------------------
// MAINTAINER: before the first store build
//   - BUNDLE_ID: iOS bundle identifier and Android application id. Override with MUXCLOUD_MOBILE_BUNDLE_ID.
//   - EAS_PROJECT_ID: from `npx eas-cli init`. Push tokens need it; without it the app runs and push is off.
//   - The Apple team id and store credentials live in eas.json / EAS credentials, never here.
// ---------------------------------------------------------------------------------------------------------------
const BUNDLE_ID = process.env.MUXCLOUD_MOBILE_BUNDLE_ID ?? 'com.joelchristner.muxcloud';
const EAS_PROJECT_ID: string | undefined = process.env.MUXCLOUD_MOBILE_EAS_PROJECT_ID;

// Kept in step with the Mux Cloud release (no independent app versioning).
const VERSION = '0.1.0-alpha';
const STORE_VERSION = '0.1.0';
const SPLASH_BACKGROUND = '#101418';
const FACE_ID_USAGE = 'Mux uses Face ID to unlock the app.';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Mux',
  slug: 'muxcloud-mobile',
  owner: process.env.MUXCLOUD_MOBILE_EAS_OWNER,
  platforms: ['ios', 'android'],
  // Stores accept only numeric versions; the alpha label stays in extra.releaseVersion.
  version: STORE_VERSION,
  scheme: 'muxcloud',
  orientation: 'default',
  icon: './assets/images/icon.png',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: BUNDLE_ID,
    supportsTablet: true,
    buildNumber: '1',
    config: { usesNonExemptEncryption: false },
    infoPlist: {
      NSFaceIDUsageDescription: FACE_ID_USAGE,
      // Mux Cloud is HTTPS. Plain HTTP is allowed only for local development and self-hosted servers on a LAN;
      // the app warns whenever the server URL is http://.
      NSAppTransportSecurity: { NSAllowsLocalNetworking: true },
    },
  },
  android: {
    package: BUNDLE_ID,
    versionCode: 1,
    adaptiveIcon: {
      backgroundColor: SPLASH_BACKGROUND,
      foregroundImage: './assets/images/adaptive-foreground.png',
    },
    permissions: ['USE_BIOMETRIC', 'USE_FINGERPRINT', 'POST_NOTIFICATIONS'],
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      { backgroundColor: SPLASH_BACKGROUND, image: './assets/images/splash-icon.png', imageWidth: 160 },
    ],
    ['expo-secure-store', { faceIDPermission: FACE_ID_USAGE }],
    'expo-localization',
    ['expo-local-authentication', { faceIDPermission: FACE_ID_USAGE }],
    ['expo-notifications', { color: '#167a5b', icon: './assets/images/notification-icon.png' }],
    'expo-font',
    'expo-asset',
    'expo-sharing',
    'expo-status-bar',
  ],
  experiments: {
    // metro.config.js resolves the @/ and @dashboard/ aliases itself.
    tsconfigPaths: false,
  },
  extra: {
    releaseVersion: VERSION,
    eas: EAS_PROJECT_ID ? { projectId: EAS_PROJECT_ID } : undefined,
  },
});
