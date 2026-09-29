import {
  CUSTOMER_DETAIL_EMPTY_VALUE,
  formatCustomerBodySize,
  formatCustomerDetailDate,
  formatCustomerDetailValue,
  formatCustomerDriver,
  formatCustomerGenderParenthetical,
  getCustomerGenderPresentationTone,
  getInsuranceAgeDdayLabel,
  resolveInsuranceAgeTargetDate,
  formatCustomerSsn,
  formatCustomerSsnForDisplay,
  formatCustomerSsnFull,
  getCustomerSsnVisibilityMeta,
  hasCustomerSsnDigits,
  getCustomerFollowUpPresentation,
} from '../customerDetailPresentation';
import { normalizeCustomer } from '../customerModel';

function customer(overrides: Record<string, unknown> = {}) {
  return normalizeCustomer({
    id: 1,
    name: '테스트 고객',
    notes: {},
    ...overrides,
  });
}

describe('customer detail presentation', () => {
  test('uses one empty-value representation', () => {
    expect(formatCustomerDetailValue('')).toBe(CUSTOMER_DETAIL_EMPTY_VALUE);
    expect(formatCustomerDetailValue('  값  ')).toBe('값');
    expect(formatCustomerDetailDate('2026-09-01T10:00:00.000Z')).toBe('2026.09.01');
  });

  test('masks a normalized resident number', () => {
    expect(formatCustomerSsn('900101-1234567')).toBe('900101-1******');
    expect(formatCustomerSsn('')).toBe(CUSTOMER_DETAIL_EMPTY_VALUE);
  });

  test('toggles resident number display between masked and full values', () => {
    const ssn = '900101-1234567';
    expect(hasCustomerSsnDigits(ssn)).toBe(true);
    expect(formatCustomerSsnFull(ssn)).toBe('900101-1234567');
    expect(formatCustomerSsnForDisplay(ssn, false)).toBe('900101-1******');
    expect(formatCustomerSsnForDisplay(ssn, true)).toBe('900101-1234567');
    expect(getCustomerSsnVisibilityMeta(ssn, false)).toEqual({
      canToggle: true,
      displayValue: '900101-1******',
      accessibilityLabel: '주민등록번호 보기',
    });
    expect(getCustomerSsnVisibilityMeta(ssn, true)).toEqual({
      canToggle: true,
      displayValue: '900101-1234567',
      accessibilityLabel: '주민등록번호 숨기기',
    });
  });

  test('hides resident number toggle when value is missing or invalid', () => {
    expect(hasCustomerSsnDigits('')).toBe(false);
    expect(getCustomerSsnVisibilityMeta('', false).canToggle).toBe(false);
    expect(getCustomerSsnVisibilityMeta('900101', false).canToggle).toBe(false);
  });

  test('formats gender parenthetical labels from stored gender only', () => {
    expect(formatCustomerGenderParenthetical('male')).toBe('(남)');
    expect(formatCustomerGenderParenthetical('female')).toBe('(여)');
    expect(formatCustomerGenderParenthetical(null)).toBeNull();
    expect(getCustomerGenderPresentationTone('male')).toBe('male');
    expect(getCustomerGenderPresentationTone(null)).toBeNull();
  });

  test('computes insurance age d-day labels from nextAgeDate SSOT', () => {
    const now = new Date('2026-09-18T15:00:00+09:00');
    expect(getInsuranceAgeDdayLabel('2026-09-23', now)).toBe('D-5');
    expect(getInsuranceAgeDdayLabel('2026-09-19', now)).toBe('D-1');
    expect(getInsuranceAgeDdayLabel('2026-09-18', now)).toBe('오늘');
    expect(getInsuranceAgeDdayLabel('2026-09-18T00:00:00.000Z', now)).toBe('오늘');
    expect(getInsuranceAgeDdayLabel(null, now)).toBeNull();
    expect(getInsuranceAgeDdayLabel('', now)).toBeNull();
    expect(getInsuranceAgeDdayLabel('2026-09-18', now)).not.toBe('D-0');
    expect(getInsuranceAgeDdayLabel('2026-09-18', now)).not.toBe('D-Day');
  });

  test('rolls past nextAgeDate forward to the next occurrence', () => {
    const now = new Date('2026-09-18T09:00:00+09:00');
    expect(resolveInsuranceAgeTargetDate('2026-03-15', now)).toBe('2027-03-15');
    expect(getInsuranceAgeDdayLabel('2026-03-15', now)).toBe('D-178');
    expect(getInsuranceAgeDdayLabel('2026-09-23', now)).toBe('D-5');
  });

  test('handles year boundary without timezone drift', () => {
    const now = new Date('2026-12-31T23:30:00+09:00');
    expect(getInsuranceAgeDdayLabel('2027-01-01', now)).toBe('D-1');
    expect(getInsuranceAgeDdayLabel('2026-12-31', now)).toBe('오늘');
  });

  test('describes body size and driving without hiding partial data', () => {
    expect(formatCustomerBodySize(customer({ height: '175cm' }))).toBe('175cm / —');
    expect(formatCustomerDriver(customer({ isDriver: true }))).toBe('운전함');
    expect(formatCustomerDriver(customer({ isDriver: false }))).toBe('운전안함');
  });

  test('prioritizes overdue and today follow-up states', () => {
    expect(getCustomerFollowUpPresentation(customer({
      overdueFollowUp: true,
      todayFollowUp: true,
      followUpStatus: '진행 중',
    }))).toEqual({ label: '후속 연락 지연', tone: 'danger' });
    expect(getCustomerFollowUpPresentation(customer({ todayFollowUp: true }))).toEqual({
      label: '오늘 연락 예정',
      tone: 'warning',
    });
  });
});
