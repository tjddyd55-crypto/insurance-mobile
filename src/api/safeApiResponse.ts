/**
 * 2xx JSON body normalize — port of insurance `safeApiResponse`.
 */

const ENVELOPE_META_KEYS = new Set(['data', 'success', 'error', 'message']);

function hasNonDataSiblingKeys(b: Record<string, unknown>): boolean {
  return Object.keys(b).some((k) => !ENVELOPE_META_KEYS.has(k));
}

function hasApiErrorField(b: Record<string, unknown>): boolean {
  if (!('error' in b)) return false;
  const e = b.error;
  if (e == null || e === false) return false;
  if (typeof e === 'string') return e.length > 0;
  return true;
}

export function safeApiResponse(body: unknown): unknown {
  if (body == null) return [];
  if (Array.isArray(body)) return body;
  if (typeof body !== 'object') return [];

  const b = body as Record<string, unknown>;

  if (hasApiErrorField(b)) return [];
  if (b.success === false) return [];

  if ('data' in b && b.data !== undefined) {
    if (hasNonDataSiblingKeys(b)) return body;
    return b.data;
  }

  return body;
}
