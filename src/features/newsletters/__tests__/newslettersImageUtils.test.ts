import {
  buildNewsletterGalleryUrls,
  isNewsletterImageAttachment,
  resolveNewsletterListCardImageUrl,
} from '../newslettersImageUtils';

describe('newslettersImageUtils', () => {
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
