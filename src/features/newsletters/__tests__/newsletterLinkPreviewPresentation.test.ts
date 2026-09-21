import {
  NEWSLETTER_LINK_PREVIEW_FALLBACK_TITLE,
  canRenderNewsletterLinkPreview,
  resolveNewsletterLinkPreviewCardModel,
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
    domain: partial.domain,
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

  it('uses explicit domain then falls back to the raw url text', () => {
    expect(
      resolveNewsletterLinkPreviewDomain(
        preview({ url: 'not-a-url', domain: '  www.blog.naver.com  ' }),
      ),
    ).toBe('blog.naver.com');
    expect(resolveNewsletterLinkPreviewDomain(preview({ url: 'not-a-url' }))).toBe('not-a-url');
  });

  it('builds a sparse card model with title, domain, and placeholder', () => {
    const model = resolveNewsletterLinkPreviewCardModel(
      preview({
        url: 'https://m.blog.naver.com/minihelper/223499024370',
        title: '교통사고 후유장해. 보험사에서 기왕증으로 합의',
      }),
    );
    expect(model).toMatchObject({
      title: '교통사고 후유장해. 보험사에서 기왕증으로 합의',
      description: '',
      domain: 'm.blog.naver.com',
      imageUrl: null,
      showPlaceholder: true,
    });
  });

  it('hides the placeholder when a safe image url exists', () => {
    const model = resolveNewsletterLinkPreviewCardModel(
      preview({
        url: 'https://news.example.com/a',
        title: '안내',
        description: '본문 요약',
        imageUrl: 'https://cdn.example.com/og.png',
        siteName: '매일경제',
      }),
    );
    expect(model).toMatchObject({
      description: '본문 요약',
      domain: '매일경제',
      imageUrl: 'https://cdn.example.com/og.png',
      showPlaceholder: false,
    });
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
