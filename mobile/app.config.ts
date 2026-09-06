import type { ExpoConfig } from 'expo/config';

// Static app.json was replaced by this file so app identity/build config can
// live alongside the environment-based API configuration in src/config/env.ts
// (both read from the same process.env.EXPO_PUBLIC_* variables) instead of
// being split across two unrelated config mechanisms.

const config: ExpoConfig = {
  name: 'mobile',
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
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },

  web: {
    favicon: './assets/favicon.png',
  },

  plugins: ['expo-router', 'expo-secure-store'],

  experiments: {
    typedRoutes: true,
  },

  extra: {
    eas: {
      projectId: '42042b5c-33da-45fc-876c-236a899a3042',
    },
  },
};

export default config;