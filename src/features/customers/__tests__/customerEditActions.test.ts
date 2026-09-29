import { validateCustomerForm } from '../customerForm';
import { EMPTY_CUSTOMER_FORM } from '../customerForm';
import {
  decideCloseEdit,
  shouldEnableCustomerEditSave,
} from '../customerFormDraft';

describe('Customer edit actions (discard vs explicit save)', () => {
  it('back/cancel confirm path never implies save — only leave or confirm discard', () => {
    expect(decideCloseEdit({ dirty: false, saving: false })).toBe('leave');
    expect(decideCloseEdit({ dirty: true, saving: false })).toBe('confirm');
    expect(decideCloseEdit({ dirty: true, saving: true })).toBe('block');
  });

  it('dirty false keeps save disabled; dirty true enables save', () => {
    expect(
      shouldEnableCustomerEditSave({ initialized: true, dirty: false, saving: false }),
    ).toBe(false);
    expect(
      shouldEnableCustomerEditSave({ initialized: true, dirty: true, saving: false }),
    ).toBe(true);
  });

  it('explicit save proceeds only when dirty and validation passes', () => {
    const invalid = validateCustomerForm({ ...EMPTY_CUSTOMER_FORM, name: '' });
    expect(Object.keys(invalid).length).toBeGreaterThan(0);

    const valid = validateCustomerForm({
      ...EMPTY_CUSTOMER_FORM,
      name: '홍길동',
      gender: 'male',
      driver: 'yes',
    });
    expect(Object.keys(valid)).toHaveLength(0);
  });
});
