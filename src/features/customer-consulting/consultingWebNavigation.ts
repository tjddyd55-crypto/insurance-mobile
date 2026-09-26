import { resolveApiBaseUrl, type EnvironmentConfig } from '../../config/environment';

const EXTRA_HTTPS_HOSTS = new Set(['fonts.googleapis.com', 'fonts.gstatic.com']);
const BLOCKED_QUERY_KEYS = new Set([
  'token',
  'access_token',
  'accesstoken',
  'jwt',
  'authorization',
  'auth',
]);

export type ConsultingWebTarget =
  | { ok: true; origin: string; pageUrl: string }
  | { ok: false; reason: 'production-app' | 'insecure-origin' | 'missing-path' };

type OriginInput = Pick<EnvironmentConfig, 'isDevApp' | 'apiBaseUrl'>;

export function resolveConsultingWebTarget(
  webPath: string,
  config: OriginInput,
  productionOrigin = resolveApiBaseUrl('production'),
): ConsultingWebTarget {
  if (!config.isDevApp) {
    return { ok: false, reason: 'production-app' };
  }
  const origin = normalizeHttpsOrigin(config.apiBaseUrl);
  const production = normalizeHttpsOrigin(productionOrigin);
  if (!origin || (production && origin === production)) {
    return { ok: false, reason: 'insecure-origin' };
  }
  const pageUrl = buildPageUrl(origin, webPath);
  if (!pageUrl) {
    return { ok: false, reason: 'missing-path' };
  }
  return { ok: true, origin, pageUrl };
}

export function evaluateConsultingWebNavigation(
  rawUrl: string,
  allowedOrigin: string,
  secret: string,
): 'allow' | 'deny' {
  if (secret.length >= 8 && rawUrl.includes(secret)) {
    return 'deny';
  }
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return 'deny';
  }
  if (url.protocol === 'about:' && rawUrl.startsWith('about:blank')) {
    return 'allow';
  }
  if (url.protocol === 'blob:') {
    return 'allow';
  }
  if (url.protocol !== 'https:') {
    return 'deny';
  }
  const allowedHost = new URL(allowedOrigin).hostname.toLowerCase();
  const host = url.hostname.toLowerCase();
  if (host !== allowedHost && !EXTRA_HTTPS_HOSTS.has(host)) {
    return 'deny';
  }
  for (const key of url.searchParams.keys()) {
    if (BLOCKED_QUERY_KEYS.has(key.toLowerCase())) {
      return 'deny';
    }
  }
  return 'allow';
}

function normalizeHttpsOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !url.hostname) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

function buildPageUrl(origin: string, webPath: string): string | null {
  if (!webPath.startsWith('/') || webPath.startsWith('//') || webPath.includes('?') || webPath.includes('#') || webPath.includes('\\')) {
    return null;
  }
  const url = new URL(webPath, `${origin}/`);
  if (url.origin !== origin || url.search || url.hash) {
    return null;
  }
  return url.toString();
}
