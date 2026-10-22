import { buildDeviceContactRecords, customerPhoneRefs, resolveMatchState } from '../deviceContactMatch';
import { selectDeviceContacts, sortDeviceContacts } from '../deviceContactQuery';
import { DEVICE_CONTACT_PHONE_EXCLUSION_POLICY } from '../phoneMatchKey';
import type { CustomerPhoneRef, DeviceContactDraft } from '../deviceContactTypes';

function draft(partial: Partial<DeviceContactDraft> & Pick<DeviceContactDraft, 'contactId'>): DeviceContactDraft {
  return {
    displayName: '홍길동',
    phones: ['010-1234-5678'],
    organization: '',
    ...partial,
  };
}

function customers(): CustomerPhoneRef[] {
  return [
    ...customerPhoneRefs({ id: 1, name: '김고객', phone: '010-1234-5678' }),
    ...customerPhoneRefs({ id: 2, name: '이고객', phone: '01099990000' }),
    ...customerPhoneRefs({ id: 3, name: '박고객', phone: '010-1234-5678' }),
  ];
}

describe('device contact matching', () => {
  it('classifies customer, unregistered, and duplicate without merging', () => {
    expect(resolveMatchState(0, false)).toBe('unregistered');
    expect(resolveMatchState(1, false)).toBe('customer');
    expect(resolveMatchState(2, false)).toBe('duplicate');
    expect(resolveMatchState(1, true)).toBe('duplicate');
    expect(resolveMatchState(0, true)).toBe('duplicate');

    const records = buildDeviceContactRecords([
      draft({ contactId: 'a', displayName: '김고객', phones: ['+82 10 1234 5678'] }),
      draft({ contactId: 'b', displayName: '미등록', phones: ['010-5555-6666'], organization: '원보험' }),
      draft({ contactId: 'c', displayName: '복제1', phones: ['01099990000'] }),
      draft({ contactId: 'd', displayName: '복제2', phones: ['010-9999-0000'] }),
      draft({ contactId: 'e', displayName: '번호없음', phones: ['집'] }),
    ], customers());

    expect(records.map((row) => row.contactId)).toEqual(['a', 'b', 'c', 'd']);
    expect(records.find((row) => row.contactId === 'a')?.matchState).toBe('duplicate');
    expect(records.find((row) => row.contactId === 'a')?.matchedCustomerIds.sort()).toEqual([1, 3]);
    expect(records.find((row) => row.contactId === 'b')?.matchState).toBe('unregistered');
    expect(records.find((row) => row.contactId === 'c')?.matchState).toBe('duplicate');
    expect(records.find((row) => row.contactId === 'd')?.matchState).toBe('duplicate');
    expect(DEVICE_CONTACT_PHONE_EXCLUSION_POLICY).toContain('목록에서 제외');
  });

  it('filters and searches name, company, and hyphen-insensitive numbers', () => {
    const records = sortDeviceContacts(buildDeviceContactRecords([
      draft({ contactId: 'b', displayName: '나가을', phones: ['01055556666'], organization: '한화' }),
      draft({ contactId: 'a', displayName: '김가람', phones: ['010-1111-2222'], organization: '삼성' }),
      draft({ contactId: 'c', displayName: '', phones: ['01033334444'] }),
    ], []));

    expect(records.map((row) => row.contactId)).toEqual(['c', 'a', 'b']);
    expect(selectDeviceContacts(records, 'unregistered', '').map((row) => row.contactId)).toEqual(['c', 'a', 'b']);
    expect(selectDeviceContacts(records, 'all', '010-1111').map((row) => row.displayName)).toEqual(['김가람']);
    expect(selectDeviceContacts(records, 'all', '삼성').map((row) => row.contactId)).toEqual(['a']);
    expect(selectDeviceContacts(records, 'customer', '')).toEqual([]);
  });

  it('matches thousands of contacts with one phone map', () => {
    const contactCount = 8000;
    const customerCount = 2000;
    const raw: DeviceContactDraft[] = [];
    for (let index = 0; index < contactCount; index += 1) {
      const phone = `010${String(10000000 + (index % 9000000)).padStart(8, '0')}`.slice(0, 11);
      raw.push({
        contactId: `c-${index}`,
        displayName: index % 17 === 0 ? '' : `이름${index}`,
        phones: index % 5 === 0 ? [phone, `010${String(20000000 + index).slice(0, 8)}`] : [phone],
        organization: index % 3 === 0 ? `회사${index % 50}` : '',
      });
    }
    const indexed: CustomerPhoneRef[] = [];
    for (let index = 0; index < customerCount; index += 1) {
      indexed.push({
        id: index + 1,
        name: `고객${index}`,
        normalizedPhone: `010${String(10000000 + index).padStart(8, '0')}`.slice(0, 11),
      });
    }
    const started = Date.now();
    const records = buildDeviceContactRecords(raw, indexed);
    const elapsed = Date.now() - started;
    expect(records.length).toBe(contactCount);
    expect(records.some((row) => row.matchState === 'customer' || row.matchState === 'duplicate')).toBe(true);
    expect(elapsed).toBeLessThan(1500);
  });
});
