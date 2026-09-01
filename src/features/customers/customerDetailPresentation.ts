import type { CustomerRecord } from './types';

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
  return formatCustomerDetailValue(value?.slice(0, 10));
}

export function formatCustomerSsn(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 13) {
    return formatCustomerDetailValue(value);
  }
  return `${digits.slice(0, 6)}-${digits.slice(6, 7)}******`;
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
    return '운전 안 함';
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
