import appIdentities from '../../app.identity.json';

export type AppEnvironment = 'development' | 'production';

export const APP_IDENTITIES = appIdentities;

function normalizeEnvironment(value: string | null | undefined): AppEnvironment | null {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'production' || normalized === 'prod') return 'production';
  if (
    normalized === 'development'
    || normalized === 'dev'
    || normalized === 'device'
    || normalized === 'local-device'
  ) {
    return 'development';
  }
  return null;
}

export function resolveBuildEnvironment(
  appVariant?: string | null,
  publicEnvironment?: string | null,
): AppEnvironment {
  return normalizeEnvironment(appVariant)
    ?? normalizeEnvironment(publicEnvironment)
    ?? 'development';
}

export function getAppIdentity(environment: AppEnvironment) {
  return APP_IDENTITIES[environment];
}
