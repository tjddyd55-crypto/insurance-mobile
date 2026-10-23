import { matchesCustomerPickerQuery } from '../customerPickerSearch';

const kim = { name: '김지웅', phone: '010-1234-5678' };
const lee = { name: '이영희', phone: '010-9876-5432' };

describe('customer search policy — 이름 + 전화번호만 (PC parity)', () => {
  it.each(['김', '김지', '지웅', '김지웅'])('name partial match: %s', (q) => {
    expect(matchesCustomerPickerQuery(kim, q)).toBe(true);
    expect(matchesCustomerPickerQuery(lee, q)).toBe(false);
  });

  it.each(['010', '0101234', '010-1234', '1234', '5678', '010 1234 5678'])(
    'phone normalized match: %s',
    (q) => {
      expect(matchesCustomerPickerQuery(kim, q)).toBe(true);
    },
  );

  it('numeric query narrows: 0101234 excludes other numbers', () => {
    expect(matchesCustomerPickerQuery(lee, '0101234')).toBe(false);
  });

  it('name query never matches every phone (empty digit query)', () => {
    expect(matchesCustomerPickerQuery(lee, '김')).toBe(false);
  });

  it('empty query is neutral (caller decides empty policy)', () => {
    expect(matchesCustomerPickerQuery(kim, '   ')).toBe(true);
  });

  it('picker query uses name and phone only', () => {
    const row = { name: '김철수', phone: '010-1111-2222' };
    expect(matchesCustomerPickerQuery(row, '태')).toBe(false);
    expect(matchesCustomerPickerQuery(row, '태안')).toBe(false);
    expect(matchesCustomerPickerQuery(row, '철수')).toBe(true);
    expect(matchesCustomerPickerQuery(row, '2222')).toBe(true);
  });
});
