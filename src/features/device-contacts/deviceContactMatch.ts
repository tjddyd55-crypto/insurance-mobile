import { uniqueMatchKeys } from './phoneMatchKey';
import type {
  CustomerPhoneRef,
  DeviceContactDraft,
  DeviceContactMatchState,
  DeviceContactRecord,
} from './deviceContactTypes';

/**
 * 연락처↔고객 대조.
 * 화면, 캐시, 이후 수신전화·AI 연결은 이 함수만 호출하면 된다.
 * 고객 목록은 호출 전에 한 번 불러 Map으로 넘긴다. 연락처마다 서버를 치지 않는다.
 */

export function customerPhoneRefs(customer: {
  id: number;
  name: string;
  phone: string;
}): CustomerPhoneRef[] {
  const name = customer.name.trim() || '이름 없음';
  return uniqueMatchKeys([customer.phone]).map((normalizedPhone) => ({
    id: customer.id,
    name,
    normalizedPhone,
  }));
}

export function buildCustomerPhoneMap(
  customers: readonly CustomerPhoneRef[],
): Map<string, CustomerPhoneRef[]> {
  const map = new Map<string, CustomerPhoneRef[]>();
  for (const customer of customers) {
    const bucket = map.get(customer.normalizedPhone);
    if (bucket) {
      bucket.push(customer);
    } else {
      map.set(customer.normalizedPhone, [customer]);
    }
  }
  return map;
}

function indexPhoneOwners(
  contacts: readonly Pick<DeviceContactRecord, 'contactId' | 'normalizedPhones'>[],
): Map<string, string[]> {
  const owners = new Map<string, string[]>();
  for (const contact of contacts) {
    for (const phone of contact.normalizedPhones) {
      const bucket = owners.get(phone);
      if (bucket) {
        bucket.push(contact.contactId);
      } else {
        owners.set(phone, [contact.contactId]);
      }
    }
  }
  return owners;
}

export function resolveMatchState(
  customerCount: number,
  deviceDuplicate: boolean,
): DeviceContactMatchState {
  if (deviceDuplicate || customerCount > 1) {
    return 'duplicate';
  }
  if (customerCount === 1) {
    return 'customer';
  }
  return 'unregistered';
}

function foldSearchText(value: string): string {
  return value.trim().toLowerCase().replace(/\s/g, '');
}

function withSearchKeys(
  draft: DeviceContactDraft,
  normalizedPhones: string[],
): Omit<DeviceContactRecord, 'matchState' | 'matchedCustomerIds'> {
  return {
    ...draft,
    normalizedPhones,
    nameKey: foldSearchText(draft.displayName),
    companyKey: foldSearchText(draft.organization),
    phoneKey: normalizedPhones.join(''),
  };
}

/** 번호가 없는 연락처는 여기서 빠진다. */
type PreparedDeviceContact = Omit<DeviceContactRecord, 'matchState' | 'matchedCustomerIds'>;

export function prepareDeviceContacts(rawContacts: readonly DeviceContactDraft[]): PreparedDeviceContact[] {
  const prepared: PreparedDeviceContact[] = [];
  for (const raw of rawContacts) {
    const normalizedPhones = uniqueMatchKeys(raw.phones);
    if (normalizedPhones.length === 0 || !raw.contactId.trim()) {
      continue;
    }
    prepared.push(withSearchKeys(raw, normalizedPhones));
  }
  return prepared;
}

function matchedCustomerIds(
  phones: readonly string[],
  customersByPhone: Map<string, CustomerPhoneRef[]>,
): number[] {
  const ids = new Set<number>();
  for (const phone of phones) {
    const matches = customersByPhone.get(phone) ?? [];
    for (const customer of matches) {
      ids.add(customer.id);
    }
  }
  return [...ids];
}

function isDeviceDuplicate(
  contactId: string,
  phones: readonly string[],
  owners: Map<string, string[]>,
): boolean {
  for (const phone of phones) {
    const ownerIds = owners.get(phone) ?? [];
    if (ownerIds.some((ownerId) => ownerId !== contactId)) {
      return true;
    }
  }
  return false;
}

export function assignMatchStates(
  prepared: readonly Omit<DeviceContactRecord, 'matchState' | 'matchedCustomerIds'>[],
  customers: readonly CustomerPhoneRef[],
): DeviceContactRecord[] {
  const customersByPhone = buildCustomerPhoneMap(customers);
  const owners = indexPhoneOwners(prepared);
  return prepared.map((contact) => {
    const ids = matchedCustomerIds(contact.normalizedPhones, customersByPhone);
    const deviceDuplicate = isDeviceDuplicate(contact.contactId, contact.normalizedPhones, owners);
    return {
      ...contact,
      matchedCustomerIds: ids,
      matchState: resolveMatchState(ids.length, deviceDuplicate),
    };
  });
}

/** 주소록 원본과 고객 인덱스로 화면 레코드를 한 번에 만든다. */
export function buildDeviceContactRecords(
  rawContacts: readonly DeviceContactDraft[],
  customers: readonly CustomerPhoneRef[],
): DeviceContactRecord[] {
  return assignMatchStates(prepareDeviceContacts(rawContacts), customers);
}

export function customersForContact(
  contact: Pick<DeviceContactRecord, 'matchedCustomerIds'>,
  customers: readonly CustomerPhoneRef[],
): { id: number; name: string }[] {
  const wanted = new Set(contact.matchedCustomerIds);
  const seen = new Set<number>();
  const result: { id: number; name: string }[] = [];
  for (const customer of customers) {
    if (!wanted.has(customer.id) || seen.has(customer.id)) {
      continue;
    }
    seen.add(customer.id);
    result.push({ id: customer.id, name: customer.name });
  }
  return result;
}
