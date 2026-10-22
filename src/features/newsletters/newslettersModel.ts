import type { NewsletterItem } from './types';
export function sortPublishedNews(rows: NewsletterItem[]): NewsletterItem[] { return [...rows].filter((row) => row.status === 'PUBLISHED').sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()); }
export function formatPublishedAt(value: string): string { const date = new Date(value); return Number.isNaN(date.getTime()) ? '게시일 미확인' : new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'medium' }).format(date); }
export function stripUnsafeMarkup(value: string): string { return value.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ').trim(); }

/**
 * 목록 상단 count 옆 GA chip. 공용(global) 게시판은 특정 GA 범위가 아니므로 표시하지 않는다.
 * (서버도 공용 게시판은 n.ga_id IS NULL + newsletterBoardId 로만 조회 — 요청에 gaCode 없음)
 * GA 전용 게시판·채널 피드는 기존처럼 현재 GA명을 표시한다. 보드 정보 로딩 전에는 표시하지 않는다.
 */
export function resolveNewsletterListGaBadge(input: {
  isBoard: boolean;
  boardScope?: 'global' | 'ga' | null;
  gaName?: string | null;
}): string | null {
  const gaName = String(input.gaName ?? '').trim();
  if (!gaName) return null;
  if (input.isBoard && input.boardScope !== 'ga') return null;
  return gaName;
}
