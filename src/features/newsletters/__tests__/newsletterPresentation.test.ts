import {
  newsletterDetailBodyText,
  newsletterListPreviewText,
  resolveNewsletterPublisherName,
} from '../newsletterPresentation';
import type { NewsletterItem } from '../types';

function item(partial: Partial<NewsletterItem> & Pick<NewsletterItem, 'id'>): NewsletterItem {
  return {
    id: partial.id,
    gaCode: partial.gaCode ?? 'YJASSET',
    insurerCode: partial.insurerCode ?? 'INS',
    insurerName: partial.insurerName ?? '',
    publisherName: partial.publisherName,
    insurerSlug: partial.insurerSlug ?? 'ins',
    title: partial.title ?? '',
    summary: partial.summary ?? '',
    heroImageUrl: partial.heroImageUrl ?? null,
    publishedAt: partial.publishedAt ?? '2026-09-18T00:00:00.000Z',
    status: partial.status ?? 'PUBLISHED',
    imageCount: partial.imageCount,
    fileCount: partial.fileCount,
    hasImages: partial.hasImages ?? false,
    hasPdf: partial.hasPdf ?? false,
    hasTextBody: partial.hasTextBody ?? false,
    boardLabel: partial.boardLabel,
    authorDisplayName: partial.authorDisplayName,
  };
}

describe('newsletterPresentation', () => {
  it('prefers publisherName over insurerName', () => {
    expect(
      resolveNewsletterPublisherName({
        publisherName: 'DB손보',
        insurerName: 'dbfire',
      }),
    ).toBe('DB손보');
  });

  it('uses affiliation name for adjuster posts', () => {
    expect(
      resolveNewsletterPublisherName({
        publisherName: '더도움손해사정',
        insurerName: '더도움손해사정',
      }),
    ).toBe('더도움손해사정');
  });

  it('renders text preview from summary', () => {
    expect(
      newsletterListPreviewText(
        item({
          id: '1',
          summary: '보험금 청구 심사 관련 변경사항을 안내드립니다.',
          hasTextBody: true,
        }),
      ),
    ).toBe('보험금 청구 심사 관련 변경사항을 안내드립니다.');
  });

  it('renders image-only summary', () => {
    expect(
      newsletterListPreviewText(
        item({ id: '2', summary: '요약 없음', imageCount: 3, hasImages: true }),
      ),
    ).toBe('이미지 3장');
  });

  it('renders file-only summary', () => {
    expect(
      newsletterListPreviewText(
        item({ id: '3', summary: '요약 없음', fileCount: 2, hasPdf: true }),
      ),
    ).toBe('첨부파일 2개');
  });

  it('omits title from detail body fallback', () => {
    expect(
      newsletterDetailBodyText({
        bodyText: '',
        summary: '요약 없음',
      }),
    ).toBe('');
  });
});
