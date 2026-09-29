import {
  formatCoveragePickerBirthDate,
  filterCoverageCustomerPickerRows,
  toCoverageCustomerPickerRow,
} from '../coverageCustomerPickerPresentation';
import { normalizeCustomer } from '../../customers/customerModel';

describe('coverage customer picker presentation', () => {
  it('shows birth date from customer field or resident number prefix', () => {
    const withBirth = normalizeCustomer({
      id: 1,
      name: '홍길동',
      birthDate: '1990-01-15',
      phone: '01012345678',
      notes: {},
    });
    expect(formatCoveragePickerBirthDate(withBirth)).toBe('1990.01.15');

    const fromSsn = normalizeCustomer({
      id: 2,
      name: '김철수',
      ssn: '9001151',
      phone: '',
      notes: {},
    });
    expect(formatCoveragePickerBirthDate(fromSsn)).toBe('1990.01.15');
  });

  it('maps picker rows with name, birth, phone and filters search', () => {
    const row = toCoverageCustomerPickerRow(
      normalizeCustomer({ id: 3, name: '박영희', birthDate: '1988-03-02', phone: '01099998888', notes: {} }),
    );
    expect(row.name).toBe('박영희');
    expect(row.birthDate).toBe('1988.03.02');
    expect(row.phone).toContain('010');
    const filtered = filterCoverageCustomerPickerRows([row], '1988');
    expect(filtered).toHaveLength(1);
  });
});
