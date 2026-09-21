import {
  NEWSLETTER_LINK_PREVIEW_FALLBACK_TITLE,
  canRenderNewsletterLinkPreview,
  resolveNewsletterLinkPreviewDescription,
  resolveNewsletterLinkPreviewDomain,
  resolveNewsletterLinkPreviewHref,
  resolveNewsletterLinkPreviewImageUrl,
  resolveNewsletterLinkPreviewTitle,
} from '../newsletterLinkPreviewPresentation';
import type { NewsletterLinkPreview } from '../types';

function preview(
  partial: Partial<NewsletterLinkPreview> & Pick<NewsletterLinkPreview, 'url'>,
): NewsletterLinkPreview {
  return {
    url: partial.url,
    title: partial.title,
    description: partial.description,
    imageUrl: partial.imageUrl,
    siteName: partial.siteName,
  };
}

describe('newsletterLinkPreviewPresentation', () => {
  it('keeps http and https hrefs', () => {
    expect(
      resolveNewsletterLinkPreviewHref(preview({ url: 'https://news.example.com/a' })),
    ).toBe('https://news.example.com/a');
    expect(
      resolveNewsletterLinkPreviewHref(preview({ url: 'http://news.example.com/a' })),
    ).toBe('http://news.example.com/a');
  });

  it('rejects non-http hrefs', () => {
    expect(resolveNewsletterLinkPreviewHref(preview({ url: 'javascript:alert(1)' }))).toBeNull();
    expect(resolveNewsletterLinkPreviewHref(preview({ url: 'ftp://files.example.com' }))).toBeNull();
    expect(resolveNewsletterLinkPreviewHref(preview({ url: '   ' }))).toBeNull();
  });

  it('uses title when present and falls back when empty', () => {
    expect(
      resolveNewsletterLinkPreviewTitle(preview({ url: 'https://example.com', title: '  안내  ' })),
    ).toBe('안내');
    expect(resolveNewsletterLinkPreviewTitle(preview({ url: 'https://example.com' }))).toBe(
      NEWSLETTER_LINK_PREVIEW_FALLBACK_TITLE,
    );
  });

  it('trims description and treats blanks as empty', () => {
    expect(
      resolveNewsletterLinkPreviewDescription(
        preview({ url: 'https://example.com', description: '  본문 요약  ' }),
      ),
    ).toBe('본문 요약');
    expect(
      resolveNewsletterLinkPreviewDescription(preview({ url: 'https://example.com', description: ' ' })),
    ).toBe('');
  });

  it('prefers site name and otherwise uses hostname without www', () => {
    expect(
      resolveNewsletterLinkPreviewDomain(
        preview({
          url: 'https://www.news.example.com/path',
          siteName: '  매일경제  ',
        }),
      ),
    ).toBe('매일경제');
    expect(
      resolveNewsletterLinkPreviewDomain(preview({ url: 'https://www.news.example.com/path' })),
    ).toBe('news.example.com');
  });

  it('returns empty domain when the url is not a web address', () => {
    expect(resolveNewsletterLinkPreviewDomain(preview({ url: 'not-a-url' }))).toBe('');
  });

  it('keeps only http image urls', () => {
    expect(
      resolveNewsletterLinkPreviewImageUrl(
        preview({ url: 'https://example.com', imageUrl: 'https://cdn.example.com/og.png' }),
      ),
    ).toBe('https://cdn.example.com/og.png');
    expect(
      resolveNewsletterLinkPreviewImageUrl(
        preview({ url: 'https://example.com', imageUrl: 'javascript:alert(1)' }),
      ),
    ).toBeNull();
  });

  it('renders only when a safe href exists', () => {
    expect(canRenderNewsletterLinkPreview(preview({ url: 'https://example.com' }))).toBe(true);
    expect(canRenderNewsletterLinkPreview(preview({ url: 'javascript:alert(1)' }))).toBe(false);
    expect(canRenderNewsletterLinkPreview(null)).toBe(false);
  });
});
