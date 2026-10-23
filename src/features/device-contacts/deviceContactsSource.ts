import { Platform } from 'react-native';
import { Contact, ContactField, ContactsSortOrder, getPermissionsAsync, requestPermissionsAsync } from 'expo-contacts';

import type { ContactsPermissionSnapshot, ContactsPermissionStatus } from './deviceContactPermission';
import type { DeviceContactDraft } from './deviceContactTypes';

/**
 * expo-contacts 57 (`Contact.getAllDetails`) 한 번의 필드 조회로 주소록을 읽는다.
 * 연락처마다 `getDetails`를 호출하지 않는다. 쓰기 API는 호출하지 않는다.
 * iOS 빌드는 하지 않고, 이 모듈이 플랫폼 경계다.
 */

const READ_FIELDS = [
  ContactField.FULL_NAME,
  ContactField.GIVEN_NAME,
  ContactField.FAMILY_NAME,
  ContactField.COMPANY,
  ContactField.PHONES,
] as const;

const PAGE_SIZE = 500;

type BulkContact = {
  id?: string;
  fullName?: string | null;
  givenName?: string | null;
  familyName?: string | null;
  company?: string | null;
  phones?: { number?: string | null }[] | null;
};

function permissionStatus(status: string, granted: boolean): ContactsPermissionStatus {
  if (granted || status === 'granted') {
    return 'granted';
  }
  if (status === 'denied') {
    return 'denied';
  }
  if (status === 'undetermined') {
    return 'undetermined';
  }
  return 'undetermined';
}

function toSnapshot(response: {
  status: string;
  granted: boolean;
  canAskAgain?: boolean;
}): ContactsPermissionSnapshot {
  return {
    status: permissionStatus(response.status, response.granted),
    granted: response.granted === true,
    canAskAgain: response.canAskAgain !== false,
  };
}

export async function readContactsPermission(): Promise<ContactsPermissionSnapshot> {
  if (Platform.OS === 'web') {
    return { status: 'unsupported', granted: false, canAskAgain: false };
  }
  return toSnapshot(await getPermissionsAsync());
}

export async function requestContactsPermission(): Promise<ContactsPermissionSnapshot> {
  if (Platform.OS === 'web') {
    return { status: 'unsupported', granted: false, canAskAgain: false };
  }
  return toSnapshot(await requestPermissionsAsync());
}

function displayNameOf(row: BulkContact): string {
  const fullName = String(row.fullName ?? '').trim();
  if (fullName) {
    return fullName;
  }
  return `${String(row.familyName ?? '').trim()}${String(row.givenName ?? '').trim()}`.trim();
}

function phonesOf(row: BulkContact): string[] {
  const phones = Array.isArray(row.phones) ? row.phones : [];
  const numbers: string[] = [];
  for (const phone of phones) {
    const number = String(phone?.number ?? '').trim();
    if (number) {
      numbers.push(number);
    }
  }
  return numbers;
}

function mapBulkContact(row: BulkContact): DeviceContactDraft | null {
  const contactId = String(row.id ?? '').trim();
  if (!contactId) {
    return null;
  }
  return {
    contactId,
    displayName: displayNameOf(row),
    phones: phonesOf(row),
    organization: String(row.company ?? '').trim(),
  };
}

function yieldToUi(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

/** 페이지 단위로 읽어 UI 스레드를 한 번씩 넘긴다. 고객 API는 호출하지 않는다. */
export async function readDeviceAddressBook(): Promise<DeviceContactDraft[]> {
  if (Platform.OS === 'web') {
    return [];
  }
  const drafts: DeviceContactDraft[] = [];
  let offset = 0;
  for (;;) {
    const page = await Contact.getAllDetails(READ_FIELDS, {
      limit: PAGE_SIZE,
      offset,
      sortOrder: ContactsSortOrder.None,
    });
    if (page.length === 0) {
      break;
    }
    for (const row of page) {
      const draft = mapBulkContact(row);
      if (draft) {
        drafts.push(draft);
      }
    }
    if (page.length < PAGE_SIZE) {
      break;
    }
    offset += page.length;
    await yieldToUi();
  }
  return drafts;
}
