/**
 * API client — Native port of insurance `src/lib/apiClient.ts` behavior.
 * - Absolute API host + `/api/...` paths (server mounts both `/api` and `/backend`)
 * - Bearer token
 * - JSON
 * - response unwrap (safeApiResponse)
 * - ApiError normalize
 * - timeout + network error
 * - 401 callback (no infinite retry)
 */

import { getEnvironmentConfig, HTTPS_ONLY_API_HOSTS } from '../config/environment';
import { safeApiResponse } from './safeApiResponse';

export class ApiError extends Error {
  status: number;
  code?: string;
  data?: unknown;
  retryAfterSec?: number;
  retryAfterMin?: number;

  constructor(
    message: string,
    status: number,
    opts?: { retryAfterSec?: number; retryAfterMin?: number; code?: string; data?: unknown },
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    if (opts?.data !== undefined) {
      this.data = opts.data;
    }
    if (opts?.code != null && String(opts.code).trim()) {
      this.code = String(opts.code).trim();
    }
    if (opts?.retryAfterSec != null && Number.isFinite(opts.retryAfterSec)) {
      this.retryAfterSec = Math.max(1, Math.floor(opts.retryAfterSec));
    }
    if (opts?.retryAfterMin != null && Number.isFinite(opts.retryAfterMin)) {
      this.retryAfterMin = Math.max(1, Math.floor(opts.retryAfterMin));
    }
  }
}

type UnauthorizedHandler = () => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;
let unauthorizedHandled = false;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
  unauthorizedHandled = false;
}

export function resetUnauthorizedLatch(): void {
  unauthorizedHandled = false;
}

/** True when the server rejected credentials (not transient network). */
export function isApiUnauthorizedError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

/** Offline, timeout, or other transport failures (status 0). */
export function isTransientApiError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 0;
}

function notifyUnauthorized(): void {
  if (unauthorizedHandled) {
    return;
  }
  unauthorizedHandled = true;
  unauthorizedHandler?.();
}

type CleartextUrl = {
  hostname: string;
  port: string;
  suffix: string;
};

function parseCleartextUrl(url: string): CleartextUrl | null {
  const match = /^http:\/\/([^/?#]+)([\s\S]*)$/i.exec(url.trim());
  if (!match) {
    return null;
  }
  const authority = match[1] ?? '';
  const colon = authority.lastIndexOf(':');
  const hasPort = colon > 0;
  return {
    hostname: (hasPort ? authority.slice(0, colon) : authority).toLowerCase(),
    port: hasPort ? authority.slice(colon + 1) : '',
    suffix: match[2] ?? '',
  };
}

function originHostname(baseUrl: string): string {
  try {
    return new URL(baseUrl).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function mustUseHttps(hostname: string, baseUrl: string): boolean {
  if (!hostname) {
    return false;
  }
  if (HTTPS_ONLY_API_HOSTS.has(hostname)) {
    return true;
  }
  const base = baseUrl.trim();
  return /^https:\/\//i.test(base) && hostname === originHostname(base);
}

/**
 * Native regression against the pre-migration claim download.
 *
 * PC web (`insurance` `fetchClaimRequestBundleBlob`) never follows the absolute
 * bundle URL. It fetches Bearer + `resolveApiUrl('/api/.../files.pdf|files.zip')`
 * on the HTTPS origin.
 *
 * Mobile web assigns that absolute URL (`window.location.assign`). The legacy
 * WebView (`insurance/apps/mobile`) then opens `*.pdf` with `Linking` (Chrome).
 * Chrome is outside this app's cleartext policy and can follow Railway's
 * http→https redirect. `shareRemoteFile` instead `fetch`es the URL in-app, and
 * OkHttp rejects `http://` before any redirect.
 *
 * Upgrade only the API host. Leave other http URLs alone.
 */
function upgradeCleartextApiUrl(url: string, baseUrl: string): string {
  const parsed = parseCleartextUrl(url);
  if (!parsed || (parsed.port !== '' && parsed.port !== '80')) {
    return url;
  }
  if (!mustUseHttps(parsed.hostname, baseUrl)) {
    return url;
  }
  return `https://${parsed.hostname}${parsed.suffix}`;
}

export function resolveApiUrl(path: string, baseUrl = getEnvironmentConfig().apiBaseUrl): string {
  if (/^https?:\/\//i.test(path)) {
    return upgradeCleartextApiUrl(path, baseUrl);
  }
  const origin = baseUrl.replace(/\/$/, '');
  const pathWithSlash = path.startsWith('/') ? path : `/${path}`;
  return upgradeCleartextApiUrl(`${origin}${pathWithSlash}`, baseUrl);
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  token?: string | null;
  body?: BodyInit | null;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 30_000;

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { token, headers, timeoutMs = DEFAULT_TIMEOUT_MS, ...rest } = options;
  const bearer = typeof token === 'string' && token.trim() ? `Bearer ${token.trim()}` : '';
  const resolvedUrl = resolveApiUrl(path);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(resolvedUrl, {
      ...rest,
      signal: rest.signal ?? controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(bearer ? { Authorization: bearer } : {}),
        ...headers,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      if (rest.signal?.aborted) {
        throw error;
      }
      throw new ApiError('요청 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.', 0);
    }
    throw new ApiError('서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.', 0);
  } finally {
    clearTimeout(timeoutId);
  }

  if (response.status === 401) {
    notifyUnauthorized();
  }

  if (response.status === 204 || response.status === 205) {
    return undefined as T;
  }

  const payload = (await response.json().catch(() => ({}))) as {
    message?: string;
    error?: string;
    code?: string;
    data?: unknown;
    retryAfterSec?: number;
    retryAfterMin?: number;
  };

  if (!response.ok) {
    const fallback =
      response.status === 429
        ? '요청이 많습니다. 잠시 후 다시 시도해 주세요.'
        : response.status === 401
          ? '로그인이 필요합니다.'
          : response.status === 404
            ? '요청한 API를 찾을 수 없습니다.'
            : '요청 처리에 실패했습니다.';
    const rawCode =
      typeof payload.code === 'string' && payload.code.trim() ? payload.code.trim() : '';
    const rawErr =
      typeof payload.error === 'string' && payload.error.trim() ? payload.error.trim() : '';
    const code =
      rawCode || (rawErr && /^[a-z][a-z0-9_]*$/i.test(rawErr) ? rawErr : undefined);
    const userMsg =
      typeof payload.message === 'string' && payload.message.trim()
        ? payload.message.trim()
        : fallback;
    if (__DEV__) {
      console.warn('[apiRequest] failed', {
        path,
        url: resolvedUrl,
        status: response.status,
        message: userMsg,
        code,
        payload,
      });
    }
    throw new ApiError(userMsg, response.status, {
      retryAfterSec: payload.retryAfterSec,
      retryAfterMin: payload.retryAfterMin,
      code,
      data: payload.data ?? payload,
    });
  }

  return safeApiResponse(payload) as T;
}
