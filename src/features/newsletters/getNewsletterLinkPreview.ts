import type { NewsletterLinkPreview } from './types';

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function trimText(value: unknown): string {
  return String(value ?? '').trim();
}

function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, '');
  } catch {
    return '';
  }
}

/**
 * 서버/DB가 camelCase와 snake_case를 섞어 내려도 카드가 같은 필드를 읽도록 정규화한다.
 */
export function normalizeNewsletterLinkPreview(raw: unknown): NewsletterLinkPreview | null {
  const row = asRecord(raw);
  if (!row) {
    return null;
  }

  const url = trimText(row.url ?? row.link_url);
  if (!url) {
    return null;
  }

  const domain = trimText(row.domain) || hostnameFromUrl(url);

  return {
    url,
    title: trimText(row.title ?? row.link_title) || null,
    description: trimText(row.description ?? row.link_description) || null,
    imageUrl: trimText(row.imageUrl ?? row.image_url ?? row.image) || null,
    siteName: trimText(row.siteName ?? row.site_name ?? row.link_site_name) || null,
    domain: domain || null,
  };
}

function parsePayload(raw: unknown): Record<string, unknown> | null {
  const asObject = asRecord(raw);
  if (asObject) {
    return asObject;
  }
  if (typeof raw !== 'string') {
    return null;
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  try {
    return asRecord(JSON.parse(trimmed));
  } catch {
    return null;
  }
}

function previewFromPayload(raw: unknown): NewsletterLinkPreview | null {
  const payload = parsePayload(raw);
  if (!payload) {
    return null;
  }
  return normalizeNewsletterLinkPreview(payload.linkPreview ?? payload.link_preview);
}

/**
 * PC `getNewsletterLinkPreview`와 동일한 추출 순서:
 * top-level linkPreview → payload.linkPreview → raw.payload.linkPreview
 */
export function getNewsletterLinkPreview(detail: unknown): NewsletterLinkPreview | null {
  const row = asRecord(detail);
  if (!row) {
    return null;
  }

  const fromTop = normalizeNewsletterLinkPreview(row.linkPreview ?? row.link_preview);
  if (fromTop) {
    return fromTop;
  }

  const fromPayload = previewFromPayload(row.payload);
  if (fromPayload) {
    return fromPayload;
  }

  const nested = asRecord(row.raw);
  return previewFromPayload(nested?.payload);
}
