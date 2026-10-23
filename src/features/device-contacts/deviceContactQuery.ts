import { phoneSearchNeedles } from './phoneMatchKey';
import type { DeviceContactFilter, DeviceContactRecord } from './deviceContactTypes';

export const DEVICE_CONTACT_FILTER_LABELS: Record<DeviceContactFilter, string> = {
  all: '전체',
  unregistered: '미등록',
  customer: '기존 고객',
  duplicate: '중복 후보',
};

export function contactMatchesFilter(
  contact: Pick<DeviceContactRecord, 'matchState'>,
  filter: DeviceContactFilter,
): boolean {
  if (filter === 'all') {
    return true;
  }
  return contact.matchState === filter;
}

export function contactMatchesQuery(
  contact: Pick<DeviceContactRecord, 'nameKey' | 'companyKey' | 'phoneKey'>,
  rawQuery: string,
): boolean {
  const query = rawQuery.trim().toLowerCase().replace(/\s/g, '');
  if (!query) {
    return true;
  }
  if (contact.nameKey.includes(query) || contact.companyKey.includes(query)) {
    return true;
  }
  return phoneSearchNeedles(rawQuery).some((needle) => contact.phoneKey.includes(needle));
}

/** 이름이 있으면 가나다, 이름이 없으면 첫 번호. */
export function compareDeviceContacts(
  left: Pick<DeviceContactRecord, 'displayName' | 'phones' | 'normalizedPhones'>,
  right: Pick<DeviceContactRecord, 'displayName' | 'phones' | 'normalizedPhones'>,
): number {
  const leftKey = left.displayName.trim() || left.phones[0] || left.normalizedPhones[0] || '';
  const rightKey = right.displayName.trim() || right.phones[0] || right.normalizedPhones[0] || '';
  return leftKey.localeCompare(rightKey, 'ko');
}

export function sortDeviceContacts(contacts: readonly DeviceContactRecord[]): DeviceContactRecord[] {
  return [...contacts].sort(compareDeviceContacts);
}

export function selectDeviceContacts(
  contacts: readonly DeviceContactRecord[],
  filter: DeviceContactFilter,
  rawQuery: string,
): DeviceContactRecord[] {
  return contacts.filter(
    (contact) => contactMatchesFilter(contact, filter) && contactMatchesQuery(contact, rawQuery),
  );
}
