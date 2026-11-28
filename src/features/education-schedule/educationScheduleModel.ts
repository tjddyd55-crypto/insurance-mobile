import { monthGrid } from '../schedule/scheduleModel';
import type { AnalysisResult, EducationMonth, EducationSchedule, ScheduleInput } from './educationScheduleApi';

export const MAX_REVIEW_ROWS = 500;
export const EDUCATION_MONTH_PATTERN = /^(?!0000)\d{4}-(0[1-9]|1[0-2])$/;

export function educationDayTone(weekday: number, holiday?: string): 'sunday' | 'saturday' | 'weekday' {
  if (holiday || weekday === 0) return 'sunday';
  if (weekday === 6) return 'saturday';
  return 'weekday';
}

export function buildEducationCalendar({ month, schedules, holidays }: Pick<EducationMonth, 'month' | 'schedules' | 'holidays'>) {
  const rowsByDate = new Map<string, EducationSchedule[]>();
  for (const row of schedules) {
    const rows = rowsByDate.get(row.date);
    if (rows) rows.push(row);
    else rowsByDate.set(row.date, [row]);
  }
  const holidaysByDate = new Map(holidays.map(({ date, name }) => [date, name]));
  return monthGrid(`${month}-01`).map((week) => week.map((cell, weekday) => {
    const holiday = holidaysByDate.get(cell.ymd);
    return {
      ...cell,
      holiday,
      tone: educationDayTone(weekday, holiday),
      schedules: rowsByDate.get(cell.ymd) ?? [],
    };
  }));
}

export function emptyScheduleInput(date: string): ScheduleInput {
  return { date, title: '', instructor: '' };
}

function normalizeText(value: string): string {
  return value.replace(/\s+/gu, ' ').trim();
}

export function scheduleInputError({ date, title, instructor }: ScheduleInput): string | undefined {
  if (!/^(?!0000)\d{4}-\d{2}-\d{2}$/.test(date)) return '올바른 교육일자를 입력해 주세요.';
  const calendarDate = new Date(`${date}T00:00:00Z`);
  if (!Number.isFinite(calendarDate.getTime()) || calendarDate.toISOString().slice(0, 10) !== date) {
    return '올바른 교육일자를 입력해 주세요.';
  }
  const normalizedTitle = normalizeText(title);
  if (!normalizedTitle || [...normalizedTitle].length > 160 || /[\0\p{Surrogate}]/u.test(normalizedTitle)) {
    return '교육기관/제목을 1~160자로 입력해 주세요.';
  }
  const normalizedInstructor = normalizeText(instructor);
  if ([...normalizedInstructor].length > 100 || /[\0\p{Surrogate}]/u.test(normalizedInstructor)) {
    return '강사를 100자 이내로 입력해 주세요.';
  }
}

export type ReviewRow = ScheduleInput & {
  id: number;
  day: number | null;
  selected: boolean;
  reviewReasons: string[];
  duplicateKey?: string;
};

function inputKey({ date, title, instructor }: ScheduleInput) {
  return JSON.stringify([date, normalizeText(title), normalizeText(instructor)]);
}

export function isReviewDuplicate(row: ReviewRow) {
  return row.duplicateKey === inputKey(row);
}

export function buildReviewRows(rows: AnalysisResult['rows']): ReviewRow[] {
  return rows.map((row) => ({
    id: row.index,
    day: row.day,
    date: row.date,
    title: row.title,
    instructor: row.instructor,
    selected: !row.duplicate && !scheduleInputError(row),
    reviewReasons: row.reviewReasons,
    duplicateKey: row.duplicate ? inputKey(row) : undefined,
  }));
}

export function toggleAllReviewRows(rows: ReviewRow[], selected: boolean): ReviewRow[] {
  return rows.map((row) => ({
    ...row,
    selected: selected && !isReviewDuplicate(row) && !scheduleInputError(row),
  }));
}

export function selectedReviewInputs(rows: ReviewRow[]): ScheduleInput[] {
  return rows.filter((row) => row.selected).map(({ date, title, instructor }) => ({ date, title, instructor }));
}
