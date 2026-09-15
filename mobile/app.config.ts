import type { ExpoConfig } from 'expo/config';

// Static app.json was replaced by this file so app identity/build config can
// live alongside the environment-based API configuration in src/config/env.ts
// (both read from the same process.env.EXPO_PUBLIC_* variables) instead of
// being split across two unrelated config mechanisms.

const config: ExpoConfig = {
  // "mobile"/"mobile" were the scaffolded create-expo-app defaults - `name`
  // is the actual display name shown under the home-screen icon, so it must
  // read as a real product, not the project folder name. `slug` is left
  // alone: it's part of how this project is already linked to a real EAS
  // project (see extra.eas.projectId below), and renaming it is a
  // deliberate, separate decision - not bundled into a cosmetic icon/name fix.
  name: 'Social Cup',
  slug: 'mobile',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  scheme: 'socialcup',

  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.nforceone.socialcup',
  },

  android: {
    package: 'com.nforceone.socialcup',
    adaptiveIcon: {
      // Matches src/theme/colors.ts's `background` token - was still the
      // default light-blue create-expo-app placeholder before.
      backgroundColor: '#FBF7F2',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },

  web: {
    favicon: './assets/favicon.png',
  },

  plugins: [
    'expo-router',
    'expo-secure-store',
    // Required by @expo/vector-icons (used for the bottom tab bar icons) via
    // its expo-font dependency - without it, any screen that imports
    // @expo/vector-icons fails to resolve 'expo-asset' at load time.
    'expo-asset',
    // This phase only uses plain card entry (CardField + createPaymentMethod) -
    // no Apple Pay / Google Pay. The installed plugin version still requires
    // merchantIdentifier/enableGooglePay to be defined (crashes on `undefined`
    // otherwise), so they're explicitly set to their "disabled" values rather
    // than configuring real wallet-payment support.
    ['@stripe/stripe-react-native', { merchantIdentifier: [], enableGooglePay: false }],
    // Previously uninstalled entirely - app.json had no "splash" key and no
    // expo-splash-screen plugin, so the app launched with no configured
    // native splash at all (SDK 53+ requires this package; there is no
    // built-in top-level "splash" config anymore). imageWidth/backgroundColor
    // match the brand palette in src/theme/colors.ts.
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#FBF7F2',
      },
    ],
  ],

  experiments: {
    typedRoutes: true,
  },

  // EAS Update (OTA): lets a JS-only change reach an already-installed
  // build without a new native build/reinstall - see eas.json's per-profile
  // "channel" (added alongside this) for which channel each build profile
  // publishes/subscribes to. `policy: "appVersion"` means an update is only
  // offered to installs whose `version` above matches the update's - bump
  // `version` whenever a change (like this one) touches native config,
  // rather than relying on JS alone to signal that.
  runtimeVersion: {
    policy: 'appVersion',
  },
  updates: {
    url: 'https://u.expo.dev/42042b5c-33da-45fc-876c-236a899a3042',
  },

  extra: {
    eas: {
      projectId: '42042b5c-33da-45fc-876c-236a899a3042',
    },
  },
};

export default config;