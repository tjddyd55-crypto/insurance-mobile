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

/** Native 목록 preview — Web과 동일하게 summary만 사용 (title UI 제거). */
export function newsletterListPreviewText(item: Pick<NewsletterItem, 'summary'>): string {
  return normalizeInsurerNewsText(stripUnsafeMarkup(item.summary));
}

/** Native 상세 본문 — Web `InsurerNewsDetailViewerContent` 와 동일 (title fallback 없음). */
export function newsletterDetailBodyText(item: {
  bodyText?: string | null;
  summary?: string | null;
}): string {
  const body = normalizeInsurerNewsText(stripUnsafeMarkup(String(item.bodyText ?? '')));
  if (body) {
    return body;
  }
  return normalizeInsurerNewsText(stripUnsafeMarkup(String(item.summary ?? '')));
}
