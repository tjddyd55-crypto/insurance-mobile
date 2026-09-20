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

function resolveLocalConfigFile(candidates: string[]): string | undefined {
  // Never commit secret config files. Local/EAS secret path only.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require('fs') as { existsSync: (path: string) => boolean };
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require('path') as { resolve: (...parts: string[]) => string };
  for (const candidate of candidates) {
    if (fs.existsSync(path.resolve(process.cwd(), candidate))) {
      return candidate;
    }
  }
  return undefined;
}

function resolveGoogleServicesFile(environment: AppEnvironment): string | undefined {
  if (environment === 'production') {
    return process.env.GOOGLE_SERVICES_JSON?.trim() || undefined;
  }
  return resolveLocalConfigFile(['./google-services.dev.json', './google-services.json']);
}

function resolveGoogleServiceInfoPlist(environment: AppEnvironment): string | undefined {
  if (environment === 'production') {
    return (
      process.env.GOOGLE_SERVICES_INFO_PLIST?.trim() ||
      resolveLocalConfigFile(['./GoogleService-Info.prod.plist', './GoogleService-Info.plist'])
    );
  }
  return resolveLocalConfigFile(['./GoogleService-Info.dev.plist', './GoogleService-Info.plist']);
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
  const googleServiceInfoPlist = resolveGoogleServiceInfoPlist(environment);

  // Play Store listing com.onefc.app is currently 1.0.2 (versionCode 4).
  // Production updates must continue that sequence; DEV stays on its own low codes.
  const isProduction = environment === 'production';
  const appVersion = isProduction ? '1.0.3' : '1.0.0';
  const androidVersionCode = isProduction ? 5 : 1;
  const iosBuildNumber = isProduction ? '5' : '1';
  const projectId =
    process.env.EAS_PROJECT_ID || '5e46e0bc-2885-4455-88ce-9ca1623df305';

  const expoConfig: ExpoConfig = {
    ...config,
    name: identity.displayName,
    slug: 'one-fc-native',
    version: appVersion,
    orientation: 'portrait',
    icon: './assets/images/icon-prod.png',
    scheme: identity.scheme,
    userInterfaceStyle: 'light',
    ios: {
      supportsTablet: false,
      bundleIdentifier: identity.applicationId,
      buildNumber: iosBuildNumber,
      googleServicesFile: googleServiceInfoPlist,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSCameraUsageDescription:
          '청구서류나 고객 관련 이미지를 촬영하여 첨부하기 위해 카메라 접근이 필요합니다.',
        NSPhotoLibraryUsageDescription:
          '청구서류나 고객 관련 파일을 첨부하기 위해 사진 보관함 접근이 필요합니다.',
        NSPhotoLibraryAddUsageDescription:
          '필요한 파일을 기기에 저장하기 위해 사진 보관함 저장 권한이 필요할 수 있습니다.',
        NSLocationWhenInUseUsageDescription:
          '고객 지도에서 내 위치를 표시하기 위해 위치 접근이 필요합니다.',
      },
    },
    android: {
      package: identity.applicationId,
      versionCode: androidVersionCode,
      googleServicesFile,
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon-prod.png',
        backgroundColor: '#003D1F',
      },
      predictiveBackGestureEnabled: false,
      permissions: ['POST_NOTIFICATIONS', 'ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION'],
      // Legacy apps/mobile parity: onefc://customers/... (DEV uses onefc-dev)
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: false,
          data: [
            {
              scheme: identity.scheme,
              host: 'customers',
            },
          ],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
    },
    web: {
      bundler: 'metro',
      favicon: './assets/images/favicon-prod.png',
    },
    plugins: [
      'expo-router',
      '@react-native-community/datetimepicker',
      'expo-secure-store',
      'expo-sharing',
      [
        'expo-notifications',
        {
          // Monochrome small icon — do not reuse full-color launcher logo.
          icon: './assets/images/notification-icon-monochrome.png',
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
        projectId,
      },
    },
    runtimeVersion: {
      policy: 'appVersion',
    },
    updates: {
      enabled: true,
      url: `https://u.expo.dev/${projectId}`,
      checkAutomatically: 'NEVER',
      fallbackToCacheTimeout: 0,
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
