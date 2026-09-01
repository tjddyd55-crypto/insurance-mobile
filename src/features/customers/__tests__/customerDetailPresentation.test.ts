import {
  CUSTOMER_DETAIL_EMPTY_VALUE,
  formatCustomerBodySize,
  formatCustomerDetailDate,
  formatCustomerDetailValue,
  formatCustomerDriver,
  formatCustomerSsn,
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
    expect(formatCustomerDetailDate('2026-09-01T10:00:00.000Z')).toBe('2026-09-01');
  });

  test('masks a normalized resident number', () => {
    expect(formatCustomerSsn('900101-1234567')).toBe('900101-1******');
    expect(formatCustomerSsn('')).toBe(CUSTOMER_DETAIL_EMPTY_VALUE);
  });

  test('describes body size and driving without hiding partial data', () => {
    expect(formatCustomerBodySize(customer({ height: '175cm' }))).toBe('175cm / —');
    expect(formatCustomerDriver(customer({ isDriver: true }))).toBe('운전함');
    expect(formatCustomerDriver(customer({ isDriver: false }))).toBe('운전 안 함');
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
