/**
 * 원수사 소식지 표시 전용 텍스트 정규화 (Web `insurerNewsText.ts` 동일).
 */
const INSURER_NEWS_PLACEHOLDER_TEXTS: ReadonlySet<string> = new Set([
  '요약 없음',
  '본문 없음',
  '본문이 없습니다',
  '본문이 없습니다.',
  '본문 내용이 없습니다.',
  '내용 없음',
  '설명 없음',
]);

export function normalizeInsurerNewsText(value?: string | null): string {
  const text = String(value ?? '').trim();
  if (!text) {
    return '';
  }
  return INSURER_NEWS_PLACEHOLDER_TEXTS.has(text) ? '' : text;
}

export function hasInsurerNewsText(value?: string | null): boolean {
  return normalizeInsurerNewsText(value).length > 0;
}
