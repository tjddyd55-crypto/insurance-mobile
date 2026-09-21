import type { NewsletterLinkPreview } from './types';

export const NEWSLETTER_LINK_PREVIEW_FALLBACK_TITLE = '관련 링크 열기';
export const NEWSLETTER_LINK_PREVIEW_IMAGE_ASPECT_RATIO = 1.91;
export const NEWSLETTER_LINK_PREVIEW_PLACEHOLDER_HEIGHT = 72;

export type NewsletterLinkPreviewCardModel = {
  href: string;
  title: string;
  description: string;
  domain: string;
  imageUrl: string | null;
  showPlaceholder: boolean;
};

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
  preview: Pick<NewsletterLinkPreview, 'url' | 'siteName' | 'domain'>,
): string {
  const siteName = trimText(preview.siteName);
  if (siteName) {
    return siteName;
  }
  const explicitDomain = trimText(preview.domain).replace(/^www\./i, '');
  if (explicitDomain) {
    return explicitDomain;
  }
  const hostname = parseHttpUrl(preview.url)?.hostname.replace(/^www\./i, '') ?? '';
  return hostname || trimText(preview.url);
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

export function resolveNewsletterLinkPreviewCardModel(
  preview: NewsletterLinkPreview | null | undefined,
): NewsletterLinkPreviewCardModel | null {
  if (!canRenderNewsletterLinkPreview(preview)) {
    return null;
  }
  const href = resolveNewsletterLinkPreviewHref(preview);
  if (!href) {
    return null;
  }
  const imageUrl = resolveNewsletterLinkPreviewImageUrl(preview);
  return {
    href,
    title: resolveNewsletterLinkPreviewTitle(preview),
    description: resolveNewsletterLinkPreviewDescription(preview),
    domain: resolveNewsletterLinkPreviewDomain(preview),
    imageUrl,
    showPlaceholder: !imageUrl,
  };
}
