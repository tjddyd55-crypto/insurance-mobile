import type { ConfigContext, ExpoConfig } from 'expo/config';

type AppVariant = 'development' | 'device' | 'production';

function resolveVariant(): AppVariant {
  const raw = String(process.env.APP_VARIANT ?? process.env.EXPO_PUBLIC_APP_ENV ?? 'development')
    .trim()
    .toLowerCase();
  if (raw === 'production' || raw === 'prod') {
    return 'production';
  }
  if (raw === 'device' || raw === 'local-device') {
    return 'device';
  }
  return 'development';
}

/**
 * EAS project continuity (M1):
 * - Legacy WebView app EAS projectId: 46c22c3a-0cf3-4a85-b877-908dab8116fe
 * - runtimeVersion was the string "production" with channel "main"
 * - Reusing that projectId + runtime/channel here risks OTA overwrite of production WebView.
 * - M1 does NOT embed that projectId. DEV builds stay isolated until a migration plan is approved.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const variant = resolveVariant();
  const isDev = variant === 'development';
  const isDevice = variant === 'device';
  const displayName = isDevice ? 'ONE FC NATIVE DEV' : isDev ? 'ONE FC DEV' : 'ONE FC';
  const scheme = isDevice ? 'onefc-native-dev' : isDev ? 'onefc-dev' : 'onefc';
  const applicationId = isDevice ? 'com.onefc.app.mobile.dev' : isDev ? 'com.onefc.app.dev' : 'com.onefc.app';

  const expoConfig: ExpoConfig = {
    ...config,
    name: displayName,
    slug: 'one-fc-native',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon-prod.png',
    scheme,
    userInterfaceStyle: 'light',
    ios: {
      supportsTablet: false,
      bundleIdentifier: applicationId,
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
      package: applicationId,
      versionCode: 1,
      config: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
        ? { googleMaps: { apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY } }
        : undefined,
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon-prod.png',
        backgroundColor: '#003D1F',
      },
      predictiveBackGestureEnabled: false,
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
        'expo-splash-screen',
        {
          image: './assets/images/splash-icon-prod.png',
          resizeMode: 'contain',
          backgroundColor: '#ffffff',
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      appVariant: variant,
      isDevApp: variant !== 'production',
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
    image: './assets/images/splash-icon-prod.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  };

  return expoConfig;
};
