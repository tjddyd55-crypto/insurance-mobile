export const RELEASE_VERSION_NAME = '1.0.3';
export const RELEASE_STORE_BUILD_NUMBER = 6;

export const PRODUCTION_APP_IDENTITY = {
  displayName: 'ONE FC',
  applicationId: 'com.onefc.app',
  scheme: 'onefc',
  apiHostFragment: 'insurance-production',
} as const;

export const DEVELOPMENT_APP_IDENTITY = {
  displayName: 'ONE FC DEV',
  applicationId: 'com.onefc.app.dev',
  scheme: 'onefc-dev',
  apiHostFragment: 'insurance-dev',
} as const;

export const IOS_GOOGLE_SERVICES_CANDIDATES = {
  production: ['GoogleService-Info.prod.plist', 'GoogleService-Info.plist'],
  development: ['GoogleService-Info.dev.plist', 'GoogleService-Info.plist'],
} as const;

export const ANDROID_GOOGLE_SERVICES_CANDIDATES = {
  productionEnv: 'GOOGLE_SERVICES_JSON',
  development: ['google-services.dev.json', 'google-services.json'],
} as const;

export const SENSITIVE_UNTRACKED_PATTERNS = [
  /^\.env\.production$/i,
  /\.p8$/i,
  /\.keystore$/i,
  /\.jks$/i,
  /credentials\.json$/i,
  /^GoogleService-Info(?!\.example).*\.plist$/i,
  /^google-services(?!\.example).*\.json$/i,
] as const;
