// @ts-nocheck
import { readFileSync } from 'fs';
import { join } from 'path';

import {
  EMPTY_CUSTOMER_FORM,
  customerFormToPayload,
  validateCustomerForm,
} from '../customerForm';

const root = join(__dirname, '..', '..', '..', '..');
const read = (rel: string) => readFileSync(join(root, rel), 'utf8');

describe('customer create form session', () => {
  it('remounts the create form on every blur (drawer keeps screens mounted)', () => {
    const route = read('app/(app)/customers/new.tsx');
    expect(route).toContain('useFocusEffect');
    expect(route).toMatch(/return \(\) => setSessionKey\(/);
    expect(route).toContain('<CustomerFormScreen key={sessionKey} mode="create" />');
  });

  it('edit route is unchanged (no session key)', () => {
    const edit = read('app/(app)/customers/[customerId]/edit.tsx');
    expect(edit).toContain('mode="edit-basic"');
    expect(edit).not.toContain('sessionKey');
  });

  it('alert-dates section is collapsed by default (no create-only expand)', () => {
    const screen = read('src/features/customers/CustomerFormScreen.tsx');
    const start = screen.indexOf("case 'alertDates':");
    const block = screen.slice(start, screen.indexOf('</CollapsibleFormSection>', start));
    expect(block).not.toContain('defaultExpanded');
  });

  it('empty form starts blank for consecutive registrations', () => {
    expect(EMPTY_CUSTOMER_FORM.name).toBe('');
    expect(EMPTY_CUSTOMER_FORM.phone).toBe('');
    expect(EMPTY_CUSTOMER_FORM.driver).toBe('');
    expect(EMPTY_CUSTOMER_FORM.specialDates).toEqual([]);
  });

  it('unset driver passes validation and is sent as null', () => {
    const form = { ...EMPTY_CUSTOMER_FORM, name: '홍길동', gender: 'male' as const };
    expect(Object.keys(validateCustomerForm(form, { mode: 'create' }))).toEqual([]);
    expect(customerFormToPayload(form).isDriver).toBeNull();
  });
});
