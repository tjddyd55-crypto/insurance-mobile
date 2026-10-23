// @ts-nocheck
import { readFileSync } from 'fs';
import { join } from 'path';

import { EMPTY_CUSTOMER_FORM } from '../../customers/customerForm';
import { buildDeviceContactRecords } from '../deviceContactMatch';
import {
  ALREADY_REGISTERED_CUSTOMER_MESSAGE,
  buildContactRegistrationParams,
  buildDeviceContactDialUrl,
  createContactSourcedCustomerForm,
  decideContactRegistration,
} from '../deviceContactRegistration';
import { createDeviceContactStoreForTests } from '../deviceContactSession';
import type { DeviceContactDraft } from '../deviceContactTypes';

const root = join(__dirname, '..', '..', '..', '..');

describe('device contact registration', () => {
  const contact: DeviceContactDraft = {
    contactId: 'device-1',
    displayName: '최상담',
    phones: ['+82 10 1234 5678'],
    organization: '원보험',
  };

  it('prefills the existing customer form and does not save by itself', () => {
    const [record] = buildDeviceContactRecords([contact], []);
    const params = buildContactRegistrationParams(record);
    expect(params).toEqual({
      name: '최상담',
      phone: '010-1234-5678',
      company: '원보험',
      source: 'contact',
    });
    const form = createContactSourcedCustomerForm(params);
    expect(form?.name).toBe('최상담');
    expect(form?.phone).toBe('010-1234-5678');
    expect(form?.job).toBe('원보험');
    expect(createContactSourcedCustomerForm({})).toBeNull();
    expect(EMPTY_CUSTOMER_FORM.job).toBe('');
    expect(decideContactRegistration([])).toEqual({ type: 'open_form' });
    expect(decideContactRegistration([7])).toEqual({
      type: 'already_registered',
      customerId: 7,
    });
    expect(decideContactRegistration([7, 8])).toEqual({ type: 'choose_candidate' });
    expect(ALREADY_REGISTERED_CUSTOMER_MESSAGE).toBe('이미 등록된 고객입니다');
  });

  it('updates only the local index after a customer is saved', async () => {
    const { store, cache } = createDeviceContactStoreForTests();
    store.publishAddressBook({
      accountKey: 'u:1|ga:2',
      raw: [contact],
      customers: [],
      customerIndexTruncated: false,
    });
    await store.flush();
    expect(store.getSnapshot().contacts[0]?.matchState).toBe('unregistered');

    store.noteRegistered({ id: 42, name: '최상담', phone: '01012345678' });
    await store.flush();
    expect(store.getSnapshot().contacts[0]?.matchState).toBe('customer');
    expect(store.getSnapshot().contacts[0]?.matchedCustomerIds).toEqual([42]);
    const saved = cache.snapshot().get('u:1|ga:2');
    expect(saved?.contacts[0]).toEqual({
      contactId: 'device-1',
      displayName: '최상담',
      phones: ['+82 10 1234 5678'],
      organization: '원보험',
      normalizedPhones: ['01012345678'],
      matchState: 'customer',
    });
    expect(JSON.stringify(saved)).not.toMatch(/token|email|ssn/i);

    await store.purge();
    expect(store.getSnapshot().contacts).toEqual([]);
    expect(cache.snapshot().size).toBe(0);
  });

  it('builds tel and sms links without a send permission', () => {
    expect(buildDeviceContactDialUrl('+82 10 1234 5678', 'tel')).toBe('tel:01012345678');
    expect(buildDeviceContactDialUrl('010-1234-5678', 'sms')).toBe('sms:01012345678');
    expect(buildDeviceContactDialUrl('없음', 'tel')).toBeNull();
  });

  it('leaves the customer form unwired (create/edit excluded from this integration)', () => {
    const screen = readFileSync(join(root, 'src/features/customers/CustomerFormScreen.tsx'), 'utf8');
    expect(screen).not.toContain('createContactSourcedCustomerForm');
    expect(screen).not.toContain('noteDeviceContactCustomerRegistered');
    expect(screen).not.toContain('fromDeviceContact');
    expect(screen).not.toContain('sourceContactColumn');
  });
});
