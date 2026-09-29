import {
  addYearsToYmd,
  coerceStoredDateValue,
  diffCalendarDaysYmd,
  formatDateForDisplay,
  todayInSeoul,
} from '../../utils/dateInput';
import { formatKoreanResidentNumber } from '../../utils/inputFormatters';
import type { CustomerGender, CustomerRecord } from './types';

export const CUSTOMER_DETAIL_EMPTY_VALUE = '—';

export type CustomerFollowUpPresentation = {
  label: string;
  tone: 'default' | 'warning' | 'danger';
};

export function formatCustomerDetailValue(
  value: string | number | null | undefined,
): string {
  const normalized = String(value ?? '').trim();
  return normalized || CUSTOMER_DETAIL_EMPTY_VALUE;
}

export function formatCustomerDetailDate(
  value: string | null | undefined,
): string {
  const formatted = formatDateForDisplay(value);
  return formatted || CUSTOMER_DETAIL_EMPTY_VALUE;
}

export type CustomerGenderPresentationTone = 'male' | 'female';

/** 기본정보 이름 옆 `(남)` / `(여)` — gender SSOT(`male`/`female`)만 사용 */
export function formatCustomerGenderParenthetical(
  gender: CustomerGender,
): string | null {
  if (gender === 'male') {
    return '(남)';
  }
  if (gender === 'female') {
    return '(여)';
  }
  return null;
}

export function getCustomerGenderPresentationTone(
  gender: CustomerGender,
): CustomerGenderPresentationTone | null {
  if (gender === 'male' || gender === 'female') {
    return gender;
  }
  return null;
}

/**
 * API `nextAgeDate` 기준. 이미 지난 상령일이면 동일 월·일의 다음 회차로 롤포워드.
 * 보험나이/상령일 자체는 재계산하지 않는다.
 */
export function resolveInsuranceAgeTargetDate(
  nextAgeDate: string | null | undefined,
  now: Date = new Date(),
): string | null {
  const stored = coerceStoredDateValue(nextAgeDate);
  if (!stored) {
    return null;
  }
  const todayYmd = todayInSeoul(now);
  let cursor = stored;
  for (let guard = 0; guard < 120; guard += 1) {
    const diff = diffCalendarDaysYmd(cursor, todayYmd);
    if (diff === null) {
      return null;
    }
    if (diff >= 0) {
      return cursor;
    }
    const rolled = addYearsToYmd(cursor, 1);
    if (!rolled) {
      return null;
    }
    cursor = rolled;
  }
  return null;
}

/** 상령일 D-day 표시 — `D-N` 또는 당일 `오늘` */
export function getInsuranceAgeDdayLabel(
  nextAgeDate: string | null | undefined,
  now: Date = new Date(),
): string | null {
  const targetYmd = resolveInsuranceAgeTargetDate(nextAgeDate, now);
  if (!targetYmd) {
    return null;
  }
  const diff = diffCalendarDaysYmd(targetYmd, todayInSeoul(now));
  if (diff === null || diff < 0) {
    return null;
  }
  if (diff === 0) {
    return '오늘';
  }
  return `D-${diff}`;
}

export function hasCustomerSsnDigits(value: string): boolean {
  return value.replace(/\D/g, '').length === 13;
}

export function formatCustomerSsn(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 13) {
    return formatCustomerDetailValue(value);
  }
  return `${digits.slice(0, 6)}-${digits.slice(6, 7)}******`;
}

export function formatCustomerSsnFull(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 13) {
    return formatCustomerDetailValue(value);
  }
  return formatKoreanResidentNumber(digits);
}

export function formatCustomerSsnForDisplay(
  value: string,
  visible: boolean,
): string {
  return visible ? formatCustomerSsnFull(value) : formatCustomerSsn(value);
}

export function getCustomerSsnVisibilityMeta(ssn: string, isVisible: boolean) {
  const canToggle = hasCustomerSsnDigits(ssn);
  return {
    canToggle,
    displayValue: formatCustomerSsnForDisplay(ssn, isVisible),
    accessibilityLabel: isVisible ? '주민등록번호 숨기기' : '주민등록번호 보기',
  };
}

export function formatCustomerBodySize(customer: CustomerRecord): string {
  const height = customer.height.trim();
  const weight = customer.weight.trim();
  if (!height && !weight) {
    return CUSTOMER_DETAIL_EMPTY_VALUE;
  }
  return `${height || CUSTOMER_DETAIL_EMPTY_VALUE} / ${weight || CUSTOMER_DETAIL_EMPTY_VALUE}`;
}

export function formatCustomerDriver(customer: CustomerRecord): string {
  if (customer.isDriver === true) {
    return '운전함';
  }
  if (customer.isDriver === false) {
    return '운전안함';
  }
  return formatCustomerDetailValue(customer.driving);
}

export function getCustomerFollowUpPresentation(
  customer: CustomerRecord,
): CustomerFollowUpPresentation | null {
  if (customer.overdueFollowUp) {
    return { label: '후속 연락 지연', tone: 'danger' };
  }
  if (customer.todayFollowUp) {
    return { label: '오늘 연락 예정', tone: 'warning' };
  }
  const status = customer.followUpStatus?.trim();
  return status ? { label: status, tone: 'default' } : null;
}
