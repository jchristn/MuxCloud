import { existsSync } from "node:fs";
import { join } from "node:path";
import type { ConfigContext, ExpoConfig } from "expo/config";
import { withEntitlementsPlist, type ConfigPlugin } from "expo/config-plugins";

// ---------------------------------------------------------------------------------------------------------------
// MAINTAINER: before the first store build
//   - BUNDLE_ID: iOS bundle identifier and Android application id. Override with MUXCLOUD_MOBILE_BUNDLE_ID.
//   - EAS_PROJECT_ID: the Expo project @joel-christner/mux. Override with MUXCLOUD_MOBILE_EAS_PROJECT_ID.
//   - GOOGLE_SERVICES_JSON: Firebase config for Android push (project mux-ai-52eb1). EAS builds read it from the EAS
//     file variable GOOGLE_SERVICES_JSON; local builds use ./google-services.json when present (git-ignored).
//   - The Apple team id and store credentials live in eas.json / EAS credentials, never here.
// ---------------------------------------------------------------------------------------------------------------
const BUNDLE_ID = process.env.MUXCLOUD_MOBILE_BUNDLE_ID ?? "ai.usemux.app";
// Expo project @joel-christner/mux.
const EAS_PROJECT_ID: string =
  process.env.MUXCLOUD_MOBILE_EAS_PROJECT_ID ??
  "695bdade-ea51-48f9-9348-56acb235f711";
const LOCAL_GOOGLE_SERVICES = join(__dirname, "google-services.json");
const GOOGLE_SERVICES_JSON: string | undefined =
  process.env.GOOGLE_SERVICES_JSON ??
  (existsSync(LOCAL_GOOGLE_SERVICES) ? "./google-services.json" : undefined);

// On-device testing with a free personal Apple team (no Lattice AI team yet): set MUXCLOUD_MOBILE_LOCAL_TEAM_ID to the
// personal team id. The build then uses the bundle id <BUNDLE_ID>.dev (so the personal team never registers the store
// id) and drops the push entitlement, which personal teams cannot sign. Never used for store builds.
const LOCAL_TEAM_ID: string | undefined =
  process.env.MUXCLOUD_MOBILE_LOCAL_TEAM_ID || undefined;
const IOS_BUNDLE_ID = LOCAL_TEAM_ID ? BUNDLE_ID + ".dev" : BUNDLE_ID;
const withoutPushEntitlement: ConfigPlugin = (cfg) =>
  withEntitlementsPlist(cfg, (mod) => {
    delete mod.modResults["aps-environment"];
    return mod;
  });

// Kept in step with the Mux Cloud release (no independent app versioning).
const VERSION = "2.0.0";
const STORE_VERSION = "2.0.0";
const SPLASH_BACKGROUND = "#101418";
const FACE_ID_USAGE = "Mux uses Face ID to unlock the app.";

const buildConfig = ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Mux",
  slug: "mux",
  owner: process.env.MUXCLOUD_MOBILE_EAS_OWNER ?? "joel-christner",
  platforms: ["ios", "android"],
  // Stores accept only numeric versions; the alpha label stays in extra.releaseVersion.
  version: STORE_VERSION,
  scheme: "muxcloud",
  orientation: "default",
  icon: "./assets/images/icon.png",
  userInterfaceStyle: "automatic",
  ios: {
    bundleIdentifier: IOS_BUNDLE_ID,
    ...(LOCAL_TEAM_ID ? { appleTeamId: LOCAL_TEAM_ID } : null),
    supportsTablet: true,
    buildNumber: "1",
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
    ...(GOOGLE_SERVICES_JSON
      ? { googleServicesFile: GOOGLE_SERVICES_JSON }
      : null),
    versionCode: 1,
    adaptiveIcon: {
      backgroundColor: SPLASH_BACKGROUND,
      foregroundImage: "./assets/images/adaptive-foreground.png",
    },
    permissions: ["USE_BIOMETRIC", "USE_FINGERPRINT", "POST_NOTIFICATIONS"],
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        backgroundColor: SPLASH_BACKGROUND,
        image: "./assets/images/splash-icon.png",
        imageWidth: 160,
      },
    ],
    ["expo-secure-store", { faceIDPermission: FACE_ID_USAGE }],
    // Arabic (and the RTL pseudo-locale) mirror the layout; without this flag iOS and Android ignore forceRTL.
    ["expo-localization", { supportsRTL: true }],
    ["expo-local-authentication", { faceIDPermission: FACE_ID_USAGE }],
    [
      "expo-notifications",
      { color: "#167a5b", icon: "./assets/images/notification-icon.png" },
    ],
    "expo-font",
    "expo-asset",
    "expo-sharing",
    "expo-status-bar",
  ],
  experiments: {
    // metro.config.js resolves the @/ and @dashboard/ aliases itself.
    tsconfigPaths: false,
  },
  extra: {
    releaseVersion: VERSION,
    // Expo Go reads this to allow I18nManager.forceRTL.
    supportsRTL: true,
    // QA: Expo Go reapplies direction from the manifest on every load (in-app forceRTL does not persist there), so
    // MUXCLOUD_MOBILE_FORCE_RTL=1 npx expo start previews the right-to-left layout. Real builds use the in-app choice.
    forcesRTL: process.env.MUXCLOUD_MOBILE_FORCE_RTL === "1" ? true : undefined,
    eas: EAS_PROJECT_ID ? { projectId: EAS_PROJECT_ID } : undefined,
  },
});

export default (context: ConfigContext): ExpoConfig => {
  const built = buildConfig(context);
  return LOCAL_TEAM_ID ? withoutPushEntitlement(built) : built;
};
