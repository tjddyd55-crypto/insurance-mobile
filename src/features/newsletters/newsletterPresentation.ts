import type { NewsletterItem } from './types';
import { stripUnsafeMarkup } from './newslettersModel';

const EMPTY_SUMMARY_MARKERS = new Set(['', '요약 없음']);

export function resolveNewsletterPublisherName(
  item: Pick<NewsletterItem, 'publisherName' | 'insurerName' | 'boardLabel'>,
): string {
  const publisher =
    item.publisherName?.trim() || item.insurerName?.trim() || item.boardLabel?.trim();
  return publisher || '—';
}

export function newsletterListPreviewText(item: NewsletterItem): string {
  const summary = stripUnsafeMarkup(item.summary);
  if (summary && !EMPTY_SUMMARY_MARKERS.has(summary)) {
    return summary;
  }

  const imageCount = item.imageCount ?? (item.hasImages ? 1 : 0);
  const fileCount = item.fileCount ?? (item.hasPdf ? 1 : 0);

  if (imageCount > 0 && fileCount > 0) {
    return `이미지 ${imageCount}장 · 첨부파일 ${fileCount}개`;
  }
  if (imageCount > 0) {
    return imageCount === 1 ? '이미지 1장' : `이미지 ${imageCount}장`;
  }
  if (fileCount > 0) {
    return fileCount === 1 ? '첨부파일 1개' : `첨부파일 ${fileCount}개`;
  }
  return '내용 없음';
}

export function newsletterDetailBodyText(item: {
  bodyText?: string | null;
  summary?: string | null;
}): string {
  const body = stripUnsafeMarkup(String(item.bodyText ?? '').trim());
  if (body) {
    return body;
  }
  const summary = stripUnsafeMarkup(String(item.summary ?? '').trim());
  return summary && !EMPTY_SUMMARY_MARKERS.has(summary) ? summary : '';
}
