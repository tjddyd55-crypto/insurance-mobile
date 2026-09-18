import {
  newsletterDetailBodyText,
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

  it('renders text preview from summary only', () => {
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

  it('hides placeholder summary text', () => {
    expect(
      newsletterListPreviewText(item({ id: '2', summary: '요약 없음', hasImages: true })),
    ).toBe('');
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
