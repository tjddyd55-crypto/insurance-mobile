import { ApiError } from '../../api/client';
import type { MemoRecord } from './types';

function numberOr(value: unknown, fallback: number): number {
  const result = Number(value);
  return Number.isFinite(result) ? Math.round(result) : fallback;
}

function nullableText(value: unknown): string | null {
  if (value == null) return null;
  const result = String(value).trim();
  return result || null;
}

export function normalizeMemo(value: unknown, context = '메모 데이터'): MemoRecord {
  if (!value || typeof value !== 'object') throw new ApiError(`${context}가 올바르지 않습니다.`, 500);
  const row = value as Record<string, unknown>;
  const id = row.id == null ? '' : String(row.id).trim();
  if (!id) throw new ApiError(`${context}에 유효한 id가 없습니다.`, 500);
  return {
    id,
    content: typeof row.content === 'string' ? row.content : '',
    x: numberOr(row.x, 100),
    y: numberOr(row.y, 100),
    width: numberOr(row.width, 260),
    height: numberOr(row.height, 200),
    zIndex: numberOr(row.zIndex ?? row.z_index, 0),
    fontSize: numberOr(row.fontSize ?? row.font_size, 16),
    fontWeight: (row.fontWeight ?? row.font_weight) === 'bold' ? 'bold' : 'normal',
    createdAt: nullableText(row.createdAt ?? row.created_at),
    updatedAt: nullableText(row.updatedAt ?? row.updated_at),
  };
}

export function normalizeMemoList(value: unknown): MemoRecord[] {
  if (!Array.isArray(value)) throw new ApiError('메모 목록 응답 구조가 올바르지 않습니다.', 500);
  return value.map((item, index) => normalizeMemo(item, `메모 목록 ${index + 1}번째 항목`));
}

export function parseMemoContent(content: string): { title: string; preview: string } {
  const trimmed = content.trim();
  if (!trimmed) return { title: '메모', preview: '' };
  const lines = trimmed.split('\n');
  const titleIndex = lines.findIndex((line) => line.trim());
  const title = lines[titleIndex]?.trim() || '메모';
  const rest = lines.slice(titleIndex + 1).join('\n').trim();
  return { title, preview: rest || trimmed };
}

export function memoTimestamp(memo: Pick<MemoRecord, 'updatedAt' | 'createdAt'>): number {
  const updated = memo.updatedAt ? Date.parse(memo.updatedAt) : Number.NaN;
  if (Number.isFinite(updated)) return updated;
  const created = memo.createdAt ? Date.parse(memo.createdAt) : Number.NaN;
  return Number.isFinite(created) ? created : 0;
}

export function formatMemoUpdatedAt(value: string | null, now = new Date()): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const ymd = (target: Date) => new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(target);
  const noteYmd = ymd(date);
  const today = ymd(now);
  if (noteYmd === today) {
    return new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(date);
  }
  if (noteYmd.slice(0, 4) === today.slice(0, 4)) {
    return `${Number(noteYmd.slice(5, 7))}월 ${Number(noteYmd.slice(8, 10))}일`;
  }
  return noteYmd.replaceAll('-', '.');
}

export const MEMO_LIST_PREVIEW_LINES = 3;

export function memoListEmptyCopy(search: string): { title: string } {
  return { title: search.trim() ? '검색 결과가 없습니다.' : '등록된 메모가 없습니다.' };
}

export function memoMatchesSearch(memo: MemoRecord, keyword: string): boolean {
  const needle = keyword.trim().toLocaleLowerCase('ko-KR');
  return !needle || memo.content.toLocaleLowerCase('ko-KR').includes(needle);
}
