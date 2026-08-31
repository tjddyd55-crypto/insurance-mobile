/**
 * Environment SSOT for Native client.
 * Only public API origins — never secrets.
 */

export type AppEnvironment = 'development' | 'production';

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
  const candidates = [
    envName ?? readEnv('EXPO_PUBLIC_APP_ENV'),
    appVariant ?? readEnv('APP_VARIANT'),
  ]
    .map((v) => String(v ?? '').trim().toLowerCase())
    .filter(Boolean);

  for (const value of candidates) {
    if (value === 'production' || value === 'prod') {
      return 'production';
    }
    if (value === 'development' || value === 'dev') {
      return 'development';
    }
  }

  // Native M1 default: always DEV unless explicitly production.
  return 'development';
}

export function resolveApiBaseUrl(environment: AppEnvironment = resolveAppEnvironment()): string {
  if (environment === 'production') {
    return normalizeOrigin(readEnv('EXPO_PUBLIC_API_BASE_URL_PROD'), DEFAULT_PROD_API);
  }
  return normalizeOrigin(readEnv('EXPO_PUBLIC_API_BASE_URL_DEV'), DEFAULT_DEV_API);
}

export function getEnvironmentConfig(environment: AppEnvironment = resolveAppEnvironment()) {
  const isDevApp = environment === 'development';
  return {
    environment,
    isDevApp,
    apiBaseUrl: resolveApiBaseUrl(environment),
    appDisplayName: isDevApp ? 'ONE FC DEV' : 'ONE FC',
    scheme: isDevApp ? 'onefc-dev' : 'onefc',
    androidPackage: isDevApp ? 'com.onefc.app.dev' : 'com.onefc.app',
    iosBundleIdentifier: isDevApp ? 'com.onefc.app.dev' : 'com.onefc.app',
  } as const;
}

export type EnvironmentConfig = ReturnType<typeof getEnvironmentConfig>;
