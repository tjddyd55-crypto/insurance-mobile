import {
  DEFAULT_CUSTOMER_LIST_FILTERS,
  filterCustomerList,
  hasActiveCustomerListFilters,
} from '../customerListFilters';
import type { CustomerRecord } from '../types';

function customer(partial: Partial<CustomerRecord> & Pick<CustomerRecord, 'id' | 'name'>): CustomerRecord {
  return {
    id: partial.id,
    userId: 'u1',
    name: partial.name,
    ssn: '',
    gender: null,
    insuranceAge: null,
    isDriver: null,
    carType: '',
    notes: {
      items: [],
      insuranceHistory: '',
      accountNumber: '',
      treatmentHistoryNote: '',
      medicationHistoryNote: '',
    },
    phone: partial.phone ?? '',
    carrier: '',
    address: '',
    height: '',
    weight: '',
    job: '',
    driving: '',
    medical: '',
    carNumber: '',
    carModel: '',
    carYear: '',
    renewalDate: '',
    isFavorite: partial.isFavorite ?? false,
    smsOptOut: false,
    createdAt: partial.createdAt ?? '2026-01-01T00:00:00.000Z',
    nextAgeDate: null,
  };
}

describe('customerListFilters', () => {
  const rows = [
    customer({ id: 1, name: '김ONE', phone: '01011112222', isFavorite: true }),
    customer({ id: 2, name: '이TWO', phone: '01033334444', isFavorite: false }),
  ];

  test('applies favorites filter to list results', () => {
    expect(
      filterCustomerList(rows, '', { ...DEFAULT_CUSTOMER_LIST_FILTERS, favoritesOnly: true }),
    ).toEqual([rows[0]]);
  });

  test('combines search and favorites filter', () => {
    expect(
      filterCustomerList(rows, '이TWO', { ...DEFAULT_CUSTOMER_LIST_FILTERS, favoritesOnly: false }),
    ).toEqual([rows[1]]);
    expect(
      filterCustomerList(rows, '이TWO', { ...DEFAULT_CUSTOMER_LIST_FILTERS, favoritesOnly: true }),
    ).toEqual([]);
  });

  test('detects active filters', () => {
    expect(hasActiveCustomerListFilters(DEFAULT_CUSTOMER_LIST_FILTERS)).toBe(false);
    expect(
      hasActiveCustomerListFilters({ ...DEFAULT_CUSTOMER_LIST_FILTERS, favoritesOnly: true }),
    ).toBe(true);
  });
});
