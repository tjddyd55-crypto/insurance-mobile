/**
 * Environment SSOT for Native client.
 * Only public API origins — never secrets.
 */

import Constants from 'expo-constants';

import {
  getAppIdentity,
  resolveBuildEnvironment,
  type AppEnvironment,
} from './appIdentity';

export type { AppEnvironment } from './appIdentity';

const DEFAULT_DEV_API = 'https://insurance-dev.up.railway.app';
const DEFAULT_PROD_API = 'https://insurance-production-7bd8.up.railway.app';

// Expo replaces EXPO_PUBLIC_* only when accessed statically.
const PUBLIC_APP_ENV = process.env.EXPO_PUBLIC_APP_ENV;
const PUBLIC_DEV_API = process.env.EXPO_PUBLIC_API_BASE_URL_DEV;
const PUBLIC_PROD_API = process.env.EXPO_PUBLIC_API_BASE_URL_PROD;

function normalizeOrigin(value: string | undefined, fallback: string): string {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return fallback.replace(/\/$/, '');
  }
  return raw.replace(/\/$/, '');
}

function buildVariant(): string {
  const extra = Constants.expoConfig?.extra as { appVariant?: unknown } | undefined;
  return String(extra?.appVariant ?? '').trim();
}

export function resolveAppEnvironment(
  envName?: string | null,
  appVariant?: string | null,
): AppEnvironment {
  return resolveBuildEnvironment(
    appVariant ?? buildVariant(),
    envName ?? PUBLIC_APP_ENV,
  );
}

export function resolveApiBaseUrl(environment: AppEnvironment = resolveAppEnvironment()): string {
  if (environment === 'production') {
    return normalizeOrigin(PUBLIC_PROD_API, DEFAULT_PROD_API);
  }
  return normalizeOrigin(PUBLIC_DEV_API, DEFAULT_DEV_API);
}

export function assertApiEnvironmentAffinity(
  environment: AppEnvironment,
  apiBaseUrl: string,
  oppositeEnvironmentApi = resolveApiBaseUrl(
    environment === 'development' ? 'production' : 'development',
  ),
): void {
  if (normalizeOrigin(apiBaseUrl, '') === normalizeOrigin(oppositeEnvironmentApi, '')) {
    throw new Error(
      environment === 'development'
        ? 'DEV 앱은 Production API에 연결할 수 없습니다.'
        : 'Production 앱은 DEV API에 연결할 수 없습니다.',
    );
  }
}

export function getEnvironmentConfig(environment: AppEnvironment = resolveAppEnvironment()) {
  const isDevApp = environment === 'development';
  const identity = getAppIdentity(environment);
  const apiBaseUrl = resolveApiBaseUrl(environment);
  assertApiEnvironmentAffinity(environment, apiBaseUrl);
  return {
    environment,
    isDevApp,
    apiBaseUrl,
    appDisplayName: identity.displayName,
    scheme: identity.scheme,
    androidPackage: identity.applicationId,
    iosBundleIdentifier: identity.applicationId,
  } as const;
}

export type EnvironmentConfig = ReturnType<typeof getEnvironmentConfig>;
