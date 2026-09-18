import type { NewsletterItem } from '../types';
import { stripUnsafeMarkup } from '../newslettersModel';
import { normalizeInsurerNewsText } from './normalizeInsurerNewsText';
import { resolveNewsletterPostAuthorLabel } from './resolveNewsletterPostAuthorLabel';

export function resolveNewsletterAuthorLabel(
  item: Pick<
    NewsletterItem,
    | 'authorDisplayName'
    | 'authorOrganizationName'
    | 'authorName'
    | 'insurerName'
    | 'boardLabel'
  >,
): string {
  return resolveNewsletterPostAuthorLabel({
    authorDisplayName: item.authorDisplayName,
    organizationName: item.authorOrganizationName,
    authorName: item.authorName,
    legacyAuthorLabel: item.insurerName,
    boardLabel: item.boardLabel,
  });
}

function listSummaryText(item: Pick<NewsletterItem, 'summary' | 'title'>): string {
  const summary = normalizeInsurerNewsText(stripUnsafeMarkup(item.summary));
  const title = stripUnsafeMarkup(item.title).trim();
  if (!summary || summary === title) {
    return '';
  }
  return summary;
}

function mediaFallbackPreview(
  item: Pick<NewsletterItem, 'hasImages' | 'hasPdf' | 'imageCount' | 'fileCount'>,
): string {
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
  return '';
}

/** Native 목록 preview — summary만 사용, title 동일 문자열·placeholder는 미표시. */
export function newsletterListPreviewText(item: NewsletterItem): string {
  const summary = listSummaryText(item);
  if (summary) {
    return summary;
  }
  return mediaFallbackPreview(item);
}

/** Native 상세 본문 — bodyText 우선, summary는 title 중복 시 미사용. */
export function newsletterDetailBodyText(item: {
  bodyText?: string | null;
  summary?: string | null;
  title?: string | null;
}): string {
  const body = normalizeInsurerNewsText(stripUnsafeMarkup(String(item.bodyText ?? '')));
  if (body) {
    return body;
  }
  const summary = normalizeInsurerNewsText(stripUnsafeMarkup(String(item.summary ?? '')));
  const title = stripUnsafeMarkup(String(item.title ?? '')).trim();
  if (summary && summary !== title) {
    return summary;
  }
  return '';
}
