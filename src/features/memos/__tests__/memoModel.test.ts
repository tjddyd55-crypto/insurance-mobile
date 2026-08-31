import {
  formatMemoUpdatedAt,
  memoMatchesSearch,
  memoTimestamp,
  normalizeMemo,
  normalizeMemoList,
  parseMemoContent,
} from '../memoModel';

describe('memoModel', () => {
  test('normalizes memo layout fields with defaults', () => {
    const memo = normalizeMemo({ id: 'abc', content: '내용', z_index: 5, font_weight: 'bold' });
    expect(memo.width).toBe(260);
    expect(memo.zIndex).toBe(5);
    expect(memo.fontWeight).toBe('bold');
  });

  test('rejects non-array list response', () => {
    expect(() => normalizeMemoList({ data: [] })).toThrow('메모 목록 응답 구조');
  });

  test('parses first non-empty line as title and remaining content as preview', () => {
    expect(parseMemoContent('\n 고객 연락\n내일 오전에 전화')).toEqual({
      title: '고객 연락', preview: '내일 오전에 전화',
    });
    expect(parseMemoContent('')).toEqual({ title: '메모', preview: '' });
  });

  test('searches the entire memo case-insensitively', () => {
    const memo = normalizeMemo({ id: 'abc', content: 'Customer\nFollow Up' });
    expect(memoMatchesSearch(memo, 'follow')).toBe(true);
    expect(memoMatchesSearch(memo, '없는 말')).toBe(false);
  });

  test('sort timestamp prefers updatedAt and formats same-day time', () => {
    const memo = normalizeMemo({
      id: 'abc', createdAt: '2026-08-30T00:00:00Z', updatedAt: '2026-08-31T01:30:00Z',
    });
    expect(memoTimestamp(memo)).toBe(Date.parse('2026-08-31T01:30:00Z'));
    expect(formatMemoUpdatedAt(memo.updatedAt, new Date('2026-08-31T03:00:00Z'))).toContain('10:30');
  });
});
