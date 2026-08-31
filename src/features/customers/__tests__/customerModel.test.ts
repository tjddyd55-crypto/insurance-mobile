import {
  customerMatchesSearch,
  formatCustomerPhone,
  normalizeCustomer,
  normalizeCustomerListResponse,
} from '../customerModel';

const rawCustomer = {
  id: 7,
  user_id: 'user-1',
  name: '홍길동',
  phone_number: '01012345678',
  gender: 'male',
  is_favorite: true,
  sms_opt_out: false,
  customer_code: 'A-007',
  notes: { items: [], insuranceHistory: '종신보험' },
  created_at: '2026-08-01T00:00:00.000Z',
};

describe('customerModel', () => {
  it('normalizes snake_case API fields and notes defaults', () => {
    const customer = normalizeCustomer(rawCustomer);
    expect(customer).toMatchObject({
      id: 7,
      userId: 'user-1',
      name: '홍길동',
      phone: '01012345678',
      customerCode: 'A-007',
      isFavorite: true,
      smsOptOut: false,
    });
    expect(customer.notes).toEqual({
      items: [],
      insuranceHistory: '종신보험',
      accountNumber: '',
      treatmentHistoryNote: '',
      medicationHistoryNote: '',
    });
  });

  it('accepts array and data/total list response shapes', () => {
    expect(normalizeCustomerListResponse([rawCustomer]).total).toBe(1);
    expect(normalizeCustomerListResponse({ data: [rawCustomer], total: 82 })).toMatchObject({
      total: 82,
      customers: [{ id: 7 }],
    });
  });

  it('rejects invalid customer rows instead of rendering corrupted data', () => {
    expect(() => normalizeCustomer({ name: 'id 없음' })).toThrow('유효한 id');
  });

  it('searches normalized name, phone and customer code', () => {
    const customer = normalizeCustomer(rawCustomer);
    expect(customerMatchesSearch(customer, '홍 길동')).toBe(true);
    expect(customerMatchesSearch(customer, '1234')).toBe(true);
    expect(customerMatchesSearch(customer, 'A-007')).toBe(true);
    expect(customerMatchesSearch(customer, '없는값')).toBe(false);
  });

  it('formats Korean phone numbers', () => {
    expect(formatCustomerPhone('01012345678')).toBe('010-1234-5678');
    expect(formatCustomerPhone('0101234567')).toBe('010-123-4567');
  });
});
