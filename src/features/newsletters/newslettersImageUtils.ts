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

function pickAttachmentUrl(row: Pick<NewsletterAttachment, 'url' | 'objectKey' | 'openUrl'>): string {
  const openUrl = String(row.openUrl ?? '').trim();
  if (openUrl) {
    return openUrl;
  }
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
    return resolveApiUrl(cdnUrlForObjectKey(trimmed.replace(/^\//, '')));
  }
  return resolveApiUrl(trimmed);
}

export function resolveNewsletterAttachmentDisplayUrl(
  row: Pick<NewsletterAttachment, 'url' | 'objectKey' | 'openUrl'>,
): string {
  return resolveNewsletterImageUrl(pickAttachmentUrl(row));
}

/** 상세 gallery 표시용 — openUrl 대신 CDN/objectKey를 우선해 list 썸네일과 동일 URL을 쓴다. */
export function resolveNewsletterGalleryAttachmentUrl(
  row: Pick<NewsletterAttachment, 'url' | 'objectKey'>,
): string {
  const objectKey = String(row.objectKey ?? '').trim();
  if (objectKey) {
    return resolveNewsletterImageUrl(objectKey);
  }
  return resolveNewsletterImageUrl(row.url);
}

export function resolveNewsletterListCardImageUrl(item: {
  heroImageObjectKey?: string | null;
  heroImageUrl?: string | null;
}): string {
  const heroObjectKey = String(item.heroImageObjectKey ?? '').trim();
  if (heroObjectKey) {
    return resolveNewsletterImageUrl(heroObjectKey);
  }
  return resolveNewsletterImageUrl(item.heroImageUrl);
}

export function buildNewsletterGalleryUrls(params: {
  heroImageUrl?: string | null;
  heroImageObjectKey?: string | null;
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
