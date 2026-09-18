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
