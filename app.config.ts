import fs from 'node:fs';
import path from 'node:path';
import type { ConfigContext, ExpoConfig } from 'expo/config';

import appIdentities from './app.identity.json';

type AppEnvironment = keyof typeof appIdentities;

function resolveBuildEnvironment(
  appVariant?: string | null,
  publicEnvironment?: string | null,
): AppEnvironment {
  const normalize = (value?: string | null): AppEnvironment | null => {
    const raw = String(value ?? '').trim().toLowerCase();
    if (raw === 'production' || raw === 'prod') return 'production';
    if (['development', 'dev', 'device', 'local-device'].includes(raw)) return 'development';
    return null;
  };
  return normalize(appVariant) ?? normalize(publicEnvironment) ?? 'development';
}

function resolveGoogleServicesFile(environment: AppEnvironment): string | undefined {
  // Never commit these files. Local/EAS secret path only.
  const candidates =
    environment === 'production'
      ? ['./google-services.prod.json', './google-services.json']
      : ['./google-services.dev.json', './google-services.json'];
  for (const relative of candidates) {
    if (fs.existsSync(path.resolve(__dirname, relative))) {
      return relative;
    }
  }
  return undefined;
}

/**
 * EAS project continuity (M1):
 * - Legacy WebView app EAS projectId: 46c22c3a-0cf3-4a85-b877-908dab8116fe
 * - runtimeVersion was the string "production" with channel "main"
 * - Reusing that projectId + runtime/channel here risks OTA overwrite of production WebView.
 * - M1 does NOT embed that projectId. DEV builds stay isolated until a migration plan is approved.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const environment = resolveBuildEnvironment(
    process.env.APP_VARIANT,
    process.env.EXPO_PUBLIC_APP_ENV,
  );
  const identity = appIdentities[environment];
  const googleServicesFile = resolveGoogleServicesFile(environment);

  const expoConfig: ExpoConfig = {
    ...config,
    name: identity.displayName,
    slug: 'one-fc-native',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon-prod.png',
    scheme: identity.scheme,
    userInterfaceStyle: 'light',
    ios: {
      supportsTablet: false,
      bundleIdentifier: identity.applicationId,
      buildNumber: '1',
      infoPlist: {
        NSCameraUsageDescription:
          '청구서류나 고객 관련 이미지를 촬영하여 첨부하기 위해 카메라 접근이 필요합니다.',
        NSPhotoLibraryUsageDescription:
          '청구서류나 고객 관련 파일을 첨부하기 위해 사진 보관함 접근이 필요합니다.',
        NSPhotoLibraryAddUsageDescription:
          '필요한 파일을 기기에 저장하기 위해 사진 보관함 저장 권한이 필요할 수 있습니다.',
      },
    },
    android: {
      package: identity.applicationId,
      versionCode: 1,
      googleServicesFile,
      config: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
        ? { googleMaps: { apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY } }
        : undefined,
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon-prod.png',
        backgroundColor: '#003D1F',
      },
      predictiveBackGestureEnabled: false,
      permissions: ['POST_NOTIFICATIONS'],
    },
    web: {
      bundler: 'metro',
      favicon: './assets/images/favicon-prod.png',
    },
    plugins: [
      'expo-router',
      'expo-secure-store',
      'expo-sharing',
      [
        'expo-notifications',
        {
          icon: './assets/images/icon-prod.png',
          color: '#003D1F',
          defaultChannel: 'claim_notifications',
        },
      ],
      [
        'expo-splash-screen',
        {
          image: './assets/images/icon-prod.png',
          imageWidth: 120,
          resizeMode: 'contain',
          backgroundColor: '#ffffff',
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      appVariant: environment,
      isDevApp: environment !== 'production',
      eas: {
        projectId: process.env.EAS_PROJECT_ID || undefined,
      },
    },
    runtimeVersion: {
      policy: 'appVersion',
    },
    updates: {
      enabled: false,
    },
  };

  // Splash kept via plugin; also set top-level for Expo Go compatibility.
  (expoConfig as ExpoConfig & { splash?: object }).splash = {
    image: './assets/images/icon-prod.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  };

  return expoConfig;
};
