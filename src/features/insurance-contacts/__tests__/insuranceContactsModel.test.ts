import { categoryOf, companyMatches, formatPhone, normalizeCompanyDirectoryEntry, normalizePhone } from '../insuranceContactsModel';

describe('insuranceContactsModel', () => {
  const entry = normalizeCompanyDirectoryEntry({ id: 1, name: '현대해상', category: 'NON_LIFE', customer_center: '1588-5656', contacts: [{ id: 2, name: '홍길동', position: '설계매니저', phone: '010 1234 5678' }] })!;
  test('normalizes and filters the operating directory contract', () => {
    expect(categoryOf(entry)).toBe('NON_LIFE');
    expect(companyMatches(entry, '홍길동')).toBe(true);
    expect(companyMatches(entry, '12345678')).toBe(true);
  });
  test('formats and sanitizes phone numbers', () => {
    expect(formatPhone('01012345678')).toBe('010-1234-5678');
    expect(formatPhone('15885656')).toBe('1588-5656');
    expect(formatPhone('15771234')).toBe('1577-1234');
    expect(formatPhone('0212345678')).toBe('02-1234-5678');
    expect(formatPhone('1588-5656')).toBe('1588-5656');
    expect(normalizePhone('02-1234-5678')).toBe('0212345678');
  });
});
