import type { AnalysisResult } from '../educationScheduleApi';
import {
  buildReviewRows,
  EDUCATION_MONTH_PATTERN,
  emptyScheduleInput,
  isReviewDuplicate,
  scheduleInputError,
  selectedReviewInputs,
  toggleAllReviewRows,
} from '../educationScheduleModel';

const candidate = (index: number, overrides: Partial<AnalysisResult['rows'][number]> = {}): AnalysisResult['rows'][number] => ({
  index, day: 29, date: '2028-02-29', title: '손해 보험', instructor: '',
  reviewReasons: [], duplicate: false, ...overrides,
});

describe('education review', () => {
  it('keeps validation reasons and initially opts out of duplicate and undated candidates', () => {
    const rows = buildReviewRows([
      candidate(0, { reviewReasons: ['요일 확인 필요'] }),
      candidate(1, { duplicate: true }),
      candidate(3, { date: '' }),
    ]);
    expect(rows.map(({ id, selected }) => [id, selected])).toEqual([[0, true], [1, false], [3, false]]);
    expect(rows[0].reviewReasons).toEqual(['요일 확인 필요']);
    expect(isReviewDuplicate({ ...rows[1], title: ' 손해   보험 ' })).toBe(true);
    expect(isReviewDuplicate({ ...rows[1], title: '다른 교육' })).toBe(false);
  });

  it('selects valid non-duplicates in bulk, allows an explicit duplicate selection and strips review metadata', () => {
    const [first, duplicate, undated] = buildReviewRows([candidate(0), candidate(1, { duplicate: true }), candidate(2, { date: '' })]);
    const manual = { ...first, ...emptyScheduleInput('2028-02-28'), id: -1, title: '직접 추가' };
    const rows = toggleAllReviewRows([first, duplicate, undated, manual], true);
    expect(rows.map((row) => row.selected)).toEqual([true, false, false, true]);
    expect(selectedReviewInputs([rows[0], { ...rows[1], selected: true }, rows[3]])).toEqual([
      { date: '2028-02-29', title: '손해 보험', instructor: '' },
      { date: '2028-02-29', title: '손해 보험', instructor: '' },
      { date: '2028-02-28', title: '직접 추가', instructor: '' },
    ]);
    expect(selectedReviewInputs(toggleAllReviewRows(rows, false))).toEqual([]);
  });

  it('matches the server date and text constraints including leap dates and Unicode length', () => {
    expect(EDUCATION_MONTH_PATTERN.test('2028-02')).toBe(true);
    expect(EDUCATION_MONTH_PATTERN.test('0000-02')).toBe(false);
    expect(EDUCATION_MONTH_PATTERN.test('2028-2')).toBe(false);
    expect(scheduleInputError(candidate(0, { date: '2026-02-29' }))).toContain('교육일자');
    expect(scheduleInputError(candidate(0, { title: '   ' }))).toContain('교육기관');
    expect(scheduleInputError(candidate(0, { title: '가'.repeat(161) }))).toContain('교육기관');
    expect(scheduleInputError(candidate(0, { instructor: '😀'.repeat(101) }))).toContain('강사');
    expect(scheduleInputError(candidate(0, { title: '😀'.repeat(160), instructor: '😀'.repeat(100) }))).toBeUndefined();
  });
});
