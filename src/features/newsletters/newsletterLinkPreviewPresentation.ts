import type { NewsletterLinkPreview } from './types';

export const NEWSLETTER_LINK_PREVIEW_FALLBACK_TITLE = '관련 링크 열기';
export const NEWSLETTER_LINK_PREVIEW_IMAGE_ASPECT_RATIO = 1.91;

function trimText(value: string | null | undefined): string {
  return String(value ?? '').trim();
}

function parseHttpUrl(value: string | null | undefined): URL | null {
  const raw = trimText(value);
  if (!raw) {
    return null;
  }
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function resolveNewsletterLinkPreviewHref(
  preview: Pick<NewsletterLinkPreview, 'url'>,
): string | null {
  return parseHttpUrl(preview.url)?.href ?? null;
}

export function resolveNewsletterLinkPreviewTitle(
  preview: Pick<NewsletterLinkPreview, 'title'>,
): string {
  return trimText(preview.title) || NEWSLETTER_LINK_PREVIEW_FALLBACK_TITLE;
}

export function resolveNewsletterLinkPreviewDescription(
  preview: Pick<NewsletterLinkPreview, 'description'>,
): string {
  return trimText(preview.description);
}

export function resolveNewsletterLinkPreviewDomain(
  preview: Pick<NewsletterLinkPreview, 'url' | 'siteName'>,
): string {
  const siteName = trimText(preview.siteName);
  if (siteName) {
    return siteName;
  }
  const hostname = parseHttpUrl(preview.url)?.hostname ?? '';
  return hostname.replace(/^www\./i, '');
}

export function resolveNewsletterLinkPreviewImageUrl(
  preview: Pick<NewsletterLinkPreview, 'imageUrl'>,
): string | null {
  return parseHttpUrl(preview.imageUrl)?.href ?? null;
}

export function canRenderNewsletterLinkPreview(
  preview: NewsletterLinkPreview | null | undefined,
): preview is NewsletterLinkPreview {
  return Boolean(preview && resolveNewsletterLinkPreviewHref(preview));
}
