/**
 * Environment SSOT for Native client.
 * Only public API origins — never secrets.
 */

import {
  getAppIdentity,
  resolveBuildEnvironment,
  type AppEnvironment,
} from './appIdentity';

export type { AppEnvironment } from './appIdentity';

const DEFAULT_DEV_API = 'https://insurance-dev.up.railway.app';
const DEFAULT_PROD_API = 'https://insurance-production-7bd8.up.railway.app';

function normalizeOrigin(value: string | undefined, fallback: string): string {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return fallback.replace(/\/$/, '');
  }
  return raw.replace(/\/$/, '');
}

function readEnv(name: string): string {
  // Avoid static inlining assumptions in tests by indexing process.env dynamically.
  return String(process.env[name] ?? '').trim();
}

export function resolveAppEnvironment(
  envName?: string | null,
  appVariant?: string | null,
): AppEnvironment {
  return resolveBuildEnvironment(
    appVariant ?? readEnv('APP_VARIANT'),
    envName ?? readEnv('EXPO_PUBLIC_APP_ENV'),
  );
}

export function resolveApiBaseUrl(environment: AppEnvironment = resolveAppEnvironment()): string {
  if (environment === 'production') {
    return normalizeOrigin(readEnv('EXPO_PUBLIC_API_BASE_URL_PROD'), DEFAULT_PROD_API);
  }
  return normalizeOrigin(readEnv('EXPO_PUBLIC_API_BASE_URL_DEV'), DEFAULT_DEV_API);
}

export function getEnvironmentConfig(environment: AppEnvironment = resolveAppEnvironment()) {
  const isDevApp = environment === 'development';
  const identity = getAppIdentity(environment);
  return {
    environment,
    isDevApp,
    apiBaseUrl: resolveApiBaseUrl(environment),
    appDisplayName: identity.displayName,
    scheme: identity.scheme,
    androidPackage: identity.applicationId,
    iosBundleIdentifier: identity.applicationId,
  } as const;
}

export type EnvironmentConfig = ReturnType<typeof getEnvironmentConfig>;
