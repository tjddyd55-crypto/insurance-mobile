import { resolveApiUrl } from '../../api/client';
import { cdnUrlForObjectKey } from '../team/teamAttachmentUpload';
import type { NewsletterAttachment } from './types';

const OBJECT_KEY_PREFIXES = ['crm-platform/', 'insurer/', 'insurer-news/', 'files/', 'platform-assets/'];

function looksLikeObjectKey(path: string): boolean {
  if (!path || /^https?:\/\//i.test(path)) {
    return false;
  }
  if (path.startsWith('/api/') || path.startsWith('/backend/')) {
    return false;
  }
  const normalized = path.replace(/^\//, '');
  return OBJECT_KEY_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

function encodeHttpUriPath(url: string): string {
  if (!/^https?:\/\//i.test(url)) {
    return url;
  }
  try {
    const parsed = new URL(url);
    parsed.pathname = parsed.pathname
      .split('/')
      .map((segment) => {
        if (!segment) {
          return '';
        }
        try {
          return encodeURIComponent(decodeURIComponent(segment));
        } catch {
          return encodeURIComponent(segment);
        }
      })
      .join('/');
    return parsed.toString();
  } catch {
    return encodeURI(url);
  }
}

export function isNewsletterImageAttachment(row: Pick<NewsletterAttachment, 'kind' | 'mimeType' | 'fileName'>): boolean {
  if (row.kind === 'image') {
    return true;
  }
  const mime = String(row.mimeType ?? '').toLowerCase();
  if (mime.startsWith('image/')) {
    return true;
  }
  const name = String(row.fileName ?? '').toLowerCase();
  return /\.(jpe?g|png|webp|gif|heic|heif)$/.test(name);
}

/** attachment 표시용 raw URL: objectKey(CDN) → url(CDN) */
function pickNewsletterAttachmentCdnUrl(
  row: Pick<NewsletterAttachment, 'url' | 'objectKey'>,
): string {
  const objectKey = String(row.objectKey ?? '').trim();
  if (objectKey) {
    return cdnUrlForObjectKey(objectKey);
  }
  return String(row.url ?? '').trim();
}

export function resolveNewsletterImageUrl(raw?: string | null): string {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) {
    return '';
  }
  if (looksLikeObjectKey(trimmed)) {
    return encodeHttpUriPath(resolveApiUrl(cdnUrlForObjectKey(trimmed.replace(/^\//, ''))));
  }
  return encodeHttpUriPath(resolveApiUrl(trimmed));
}

function resolveNewsletterAccessibleImageUrl(
  row: Pick<NewsletterAttachment, 'url' | 'objectKey' | 'openUrl'>,
): string {
  const cdnRaw = pickNewsletterAttachmentCdnUrl(row);
  if (cdnRaw) {
    const resolved = resolveNewsletterImageUrl(cdnRaw);
    if (resolved) {
      return resolved;
    }
  }
  const openUrl = String(row.openUrl ?? '').trim();
  if (openUrl) {
    return resolveNewsletterImageUrl(openUrl);
  }
  return '';
}

export function resolveNewsletterAttachmentDisplayUrl(
  row: Pick<NewsletterAttachment, 'url' | 'objectKey' | 'openUrl'>,
): string {
  const openUrl = String(row.openUrl ?? '').trim();
  if (openUrl) {
    return resolveNewsletterImageUrl(openUrl);
  }
  return resolveNewsletterImageUrl(pickNewsletterAttachmentCdnUrl(row));
}

/** 상세 gallery 표시용 — CDN/objectKey 우선, 실패 시 signed openUrl fallback */
export function resolveNewsletterGalleryAttachmentUrl(
  row: Pick<NewsletterAttachment, 'url' | 'objectKey' | 'openUrl'>,
): string {
  return resolveNewsletterAccessibleImageUrl(row);
}

export function resolveNewsletterListCardImageUrl(item: {
  heroImageObjectKey?: string | null;
  heroImageUrl?: string | null;
  heroImageOpenUrl?: string | null;
}): string {
  const heroObjectKey = String(item.heroImageObjectKey ?? '').trim();
  if (heroObjectKey) {
    const resolved = resolveNewsletterImageUrl(heroObjectKey);
    if (resolved) {
      return resolved;
    }
  }
  const heroUrl = resolveNewsletterImageUrl(item.heroImageUrl);
  if (heroUrl) {
    return heroUrl;
  }
  const heroOpenUrl = String(item.heroImageOpenUrl ?? '').trim();
  if (heroOpenUrl) {
    return resolveNewsletterImageUrl(heroOpenUrl);
  }
  return '';
}

export function buildNewsletterGalleryUrls(params: {
  heroImageUrl?: string | null;
  heroImageObjectKey?: string | null;
  heroImageOpenUrl?: string | null;
  attachments?: NewsletterAttachment[] | null;
}): string[] {
  const imageAttachments = [...(params.attachments ?? [])]
    .filter(isNewsletterImageAttachment)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const fromAttachments = imageAttachments
    .map((row) => resolveNewsletterGalleryAttachmentUrl(row))
    .filter(Boolean);

  const out: string[] = [];
  const seen = new Set<string>();
  const push = (url: string) => {
    if (!url || seen.has(url)) {
      return;
    }
    seen.add(url);
    out.push(url);
  };

  const heroResolved = resolveNewsletterListCardImageUrl(params);
  if (heroResolved && !fromAttachments.includes(heroResolved)) {
    push(heroResolved);
  }
  for (const url of fromAttachments) {
    push(url);
  }
  if (!out.length && heroResolved) {
    push(heroResolved);
  }
  return out;
}
