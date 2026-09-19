import {
  newsletterDetailBodyText,
  newsletterDetailSegmentOrder,
  newsletterListPreviewText,
  resolveNewsletterAuthorLabel,
} from '../utils/insurerNewsPresentation';
import type { NewsletterItem } from '../types';

function item(partial: Partial<NewsletterItem> & Pick<NewsletterItem, 'id'>): NewsletterItem {
  return {
    id: partial.id,
    gaCode: partial.gaCode ?? 'YJASSET',
    insurerCode: partial.insurerCode ?? 'INS',
    insurerName: partial.insurerName ?? '',
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
    authorName: partial.authorName,
    authorOrganizationName: partial.authorOrganizationName,
  };
}

describe('insurerNewsPresentation', () => {
  it('uses Web author label SSOT for insurer posts', () => {
    expect(
      resolveNewsletterAuthorLabel({
        authorDisplayName: 'DB손보',
        insurerName: 'dbfire',
      }),
    ).toBe('DB손보');
  });

  it('uses organization and author name for adjuster posts', () => {
    expect(
      resolveNewsletterAuthorLabel({
        authorOrganizationName: '더도움손해사정',
        authorName: '홍길동',
        insurerName: '더도움손해사정',
      }),
    ).toBe('더도움손해사정 · 홍길동');
  });

  it('renders summary-only preview text', () => {
    expect(
      newsletterListPreviewText(
        item({
          id: '1',
          summary: '보험금 청구 심사 관련 변경사항을 안내드립니다.',
          title: '제목은 노출하지 않음',
          hasTextBody: true,
        }),
      ),
    ).toBe('보험금 청구 심사 관련 변경사항을 안내드립니다.');
  });

  it('does not show title-like summary in list cards', () => {
    expect(
      newsletterListPreviewText(
        item({
          id: 'qa-1',
          title: '[QA] 소식지 이미지 파일 혼합 테스트',
          summary: '[QA] 소식지 이미지 파일 혼합 테스트',
          imageCount: 3,
          hasImages: true,
        }),
      ),
    ).toBe('이미지 3장');
  });

  it('renders image-only summary', () => {
    expect(
      newsletterListPreviewText(item({ id: '2', summary: '요약 없음', imageCount: 3, hasImages: true })),
    ).toBe('이미지 3장');
  });

  it('renders file-only summary', () => {
    expect(
      newsletterListPreviewText(item({ id: '3', summary: '요약 없음', fileCount: 2, hasPdf: true })),
    ).toBe('첨부파일 2개');
  });

  it('falls back to summary when bodyText is empty', () => {
    expect(
      newsletterDetailBodyText({
        bodyText: '',
        summary: '보험금 청구 심사 관련 변경사항을 안내드립니다.',
        title: '제목은 노출하지 않음',
      }),
    ).toBe('보험금 청구 심사 관련 변경사항을 안내드립니다.');
  });

  it('shows summary even when summary equals title', () => {
    expect(
      newsletterDetailBodyText({
        bodyText: '',
        summary: '[QA] 소식지 카드 테스트 1',
        title: '[QA] 소식지 카드 테스트 1',
      }),
    ).toBe('[QA] 소식지 카드 테스트 1');
  });

  it('keeps real detail body text', () => {
    expect(
      newsletterDetailBodyText({
        bodyText: '실제 본문 내용',
        summary: '요약 없음',
        title: '제목',
      }),
    ).toBe('실제 본문 내용');
  });

  it('orders detail segments as body then gallery then files', () => {
    expect(
      newsletterDetailSegmentOrder({
        bodyText: '본문',
        galleryUrlCount: 2,
        fileCount: 1,
      }),
    ).toEqual(['body', 'gallery', 'files']);
  });

  it('renders body-only detail segments', () => {
    expect(
      newsletterDetailSegmentOrder({
        bodyText: '본문',
        galleryUrlCount: 0,
        fileCount: 0,
      }),
    ).toEqual(['body']);
  });

  it('renders image-only detail segments', () => {
    expect(
      newsletterDetailSegmentOrder({
        bodyText: '',
        galleryUrlCount: 3,
        fileCount: 0,
      }),
    ).toEqual(['gallery']);
  });

  it('renders file-only detail segments', () => {
    expect(
      newsletterDetailSegmentOrder({
        bodyText: '',
        galleryUrlCount: 0,
        fileCount: 2,
      }),
    ).toEqual(['files']);
  });
});
