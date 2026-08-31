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

import { getEnvironmentConfig } from '../config/environment';
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

function notifyUnauthorized(): void {
  if (unauthorizedHandled) {
    return;
  }
  unauthorizedHandled = true;
  unauthorizedHandler?.();
}

export function resolveApiUrl(path: string, baseUrl = getEnvironmentConfig().apiBaseUrl): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const origin = baseUrl.replace(/\/$/, '');
  if (path.startsWith('/api/')) {
    return `${origin}${path}`;
  }
  if (path.startsWith('/')) {
    return `${origin}${path}`;
  }
  return `${origin}/${path}`;
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

  if (response.status === 204) {
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
    throw new ApiError(userMsg, response.status, {
      retryAfterSec: payload.retryAfterSec,
      retryAfterMin: payload.retryAfterMin,
      code,
      data: payload.data,
    });
  }

  return safeApiResponse(payload) as T;
}
