const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export type DeviceLocalDateParts = {
  year: string;
  month: string;
  day: string;
};

/**
 * 달력 날짜(YYYY-MM-DD)는 시간대 변환 없이 그 날짜를 유지한다.
 * 시각이 있는 ISO 순간은 `Date`로 파싱한 뒤 기기 로컬 연·월·일을 쓴다.
 */
export function deviceLocalDateParts(value: string | null | undefined): DeviceLocalDateParts | null {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return null;
  const calendar = CALENDAR_DATE.exec(trimmed);
  if (calendar?.[1] && calendar[2] && calendar[3]) {
    return { year: calendar[1], month: calendar[2], day: calendar[3] };
  }
  return partsFromInstant(trimmed);
}

function partsFromInstant(value: string): DeviceLocalDateParts | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return {
    year: String(date.getFullYear()),
    month: String(date.getMonth() + 1).padStart(2, '0'),
    day: String(date.getDate()).padStart(2, '0'),
  };
}

export function formatDeviceLocalDateDots(value: string | null | undefined, empty = '—'): string {
  const parts = deviceLocalDateParts(value);
  if (!parts) return empty;
  return `${parts.year}.${parts.month}.${parts.day}`;
}

export function formatDeviceLocalYmd(value: string | null | undefined): string | null {
  const parts = deviceLocalDateParts(value);
  if (!parts) return null;
  return `${parts.year}-${parts.month}-${parts.day}`;
}
