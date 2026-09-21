import {
  buildNewsletterGalleryUrls,
  isNewsletterImageAttachment,
  resolveNewsletterAttachmentDisplayUrl,
  resolveNewsletterListCardImageUrl,
} from '../newslettersImageUtils';

describe('newslettersImageUtils', () => {
  it('prefers signed openUrl for attachment display', () => {
    expect(
      resolveNewsletterAttachmentDisplayUrl({
        url: 'https://cdn.example/legacy.png',
        objectKey: 'crm-platform/dev/file.png',
        openUrl: '/api/insurer-news/id/attachments/1/open?accessToken=abc',
      }),
    ).toContain('/api/insurer-news/id/attachments/1/open');
  });
  test('detects image attachments by kind, mime, or extension', () => {
    expect(isNewsletterImageAttachment({ kind: 'image', fileName: 'a.pdf' })).toBe(true);
    expect(isNewsletterImageAttachment({ kind: 'file', mimeType: 'image/png', fileName: 'a.bin' })).toBe(true);
    expect(isNewsletterImageAttachment({ kind: 'file', fileName: 'photo.JPEG' })).toBe(true);
    expect(isNewsletterImageAttachment({ kind: 'file', mimeType: 'application/pdf', fileName: 'doc.pdf' })).toBe(false);
  });

  test('prefers hero object key for list card image', () => {
    const url = resolveNewsletterListCardImageUrl({
      heroImageObjectKey: 'insurer-news/hero.jpg',
      heroImageUrl: 'https://example.com/fallback.jpg',
    });
    expect(url).toContain('insurer-news/hero.jpg');
  });

  test('resolves production insurance/ object keys to CDN, not the API host', () => {
    const objectKey = 'insurance/yjasset/shared/insurer-newsletters/삼성생명/2026/07/x.jpg';
    const url = resolveNewsletterListCardImageUrl({
      heroImageObjectKey: objectKey,
      heroImageUrl: 'https://insurance-production-7bd8.up.railway.app/insurance/yjasset/shared/insurer-newsletters/삼성생명/2026/07/x.jpg',
    });
    expect(url).toContain('https://cdn.platform-assets.com/insurance/yjasset/shared/insurer-newsletters/');
    expect(url).toContain('%EC%82%BC%EC%84%B1%EC%83%9D%EB%AA%85');
    expect(url).not.toContain('삼성생명');
    expect(url).not.toContain('insurance-production-7bd8.up.railway.app');
    expect(url).not.toContain('insurance-dev.up.railway.app');
  });

  test('keeps CDN when both insurance/ objectKey and heroImageUrl CDN are present', () => {
    const objectKey = 'insurance/global/shared/insurer-newsletters/samsung/2026/07/x.jpg';
    const cdnUrl = `https://cdn.platform-assets.com/${objectKey}`;
    const url = resolveNewsletterListCardImageUrl({
      heroImageObjectKey: objectKey,
      heroImageUrl: cdnUrl,
    });
    expect(url).toBe(cdnUrl);
    expect(url.startsWith('https://cdn.platform-assets.com/insurance/')).toBe(true);
    expect(url).not.toMatch(/up\.railway\.app/);
  });

  test('falls back to heroImageOpenUrl when CDN fields are missing', () => {
    const url = resolveNewsletterListCardImageUrl({
      heroImageUrl: null,
      heroImageOpenUrl: '/api/insurer-news/id/attachments/1/open?accessToken=abc',
    });
    expect(url).toContain('/api/insurer-news/id/attachments/1/open');
  });

  test('encodes unicode path segments for production CDN urls', () => {
    const url = resolveNewsletterListCardImageUrl({
      heroImageUrl: 'https://cdn.platform-assets.com/insurer/yjasset/news/2026-04/삼성화재/file.png',
    });
    expect(url).toContain('%EC%82%BC%EC%84%B1%ED%99%94%EC%9E%AC');
    expect(url).not.toContain('삼성화재');
  });

  test('uses signed openUrl for gallery when object key is absent', () => {
    const urls = buildNewsletterGalleryUrls({
      attachments: [
        {
          id: '1',
          kind: 'image',
          mimeType: 'image/png',
          fileName: '1.png',
          url: '',
          openUrl: '/api/insurer-news/id/attachments/1/open?accessToken=abc',
          sortOrder: 0,
        },
      ],
    });
    expect(urls).toHaveLength(1);
    expect(urls[0]).toContain('/api/insurer-news/id/attachments/1/open');
  });

  test('dedupes hero and attachment when they reference the same object key', () => {
    const objectKey = 'crm-platform/dev/insurance/yjasset/shared/insurer-newsletters/test/2026/09/1.png';
    const urls = buildNewsletterGalleryUrls({
      heroImageObjectKey: objectKey,
      heroImageUrl: `https://cdn.example/${objectKey}`,
      attachments: [
        {
          id: '1',
          kind: 'image',
          mimeType: 'image/png',
          fileName: '1.png',
          url: `https://cdn.example/${objectKey}`,
          objectKey,
          openUrl: '/api/insurer-news/id/attachments/1/open?accessToken=abc',
          sortOrder: 0,
        },
      ],
    });
    expect(urls).toHaveLength(1);
    expect(urls[0]).toContain(objectKey);
    expect(urls[0]).not.toContain('/api/insurer-news/');
  });

  test('builds gallery urls from hero and image attachments in order', () => {
    const urls = buildNewsletterGalleryUrls({
      heroImageUrl: 'https://example.com/hero.jpg',
      attachments: [
        { id: '1', kind: 'image', mimeType: 'image/jpeg', fileName: 'a.jpg', url: 'https://example.com/a.jpg', sortOrder: 1 },
        { id: '2', kind: 'file', mimeType: 'application/pdf', fileName: 'b.pdf', url: 'https://example.com/b.pdf', sortOrder: 2 },
        { id: '3', kind: 'file', mimeType: 'image/png', fileName: 'c.png', url: 'https://example.com/c.png', sortOrder: 3 },
      ],
    });
    expect(urls).toEqual([
      'https://example.com/hero.jpg',
      'https://example.com/a.jpg',
      'https://example.com/c.png',
    ]);
  });
});
