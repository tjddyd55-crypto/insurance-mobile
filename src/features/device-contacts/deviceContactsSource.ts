import { Platform } from 'react-native';

import type { ContactsPermissionSnapshot } from './deviceContactPermission';
import type { DeviceContactDraft } from './deviceContactTypes';

/**
 * 이 바이너리에는 주소록 네이티브 모듈을 넣지 않는다.
 * 대조, 캐시, 고객 등록 연결은 다시 붙이기 쉽게 남겨 두고, 주소록 읽기만 여기서 끊는다.
 * 주소록 패키지를 import 하면 Metro 가 네이티브 모듈을 묶으므로 import 하지 않는다.
 *
 * 다시 붙일 때 loadAddressBookPage 만 페이지 조회로 바꾸면 된다.
 * 한 번의 필드 조회로 이름, 전화, 회사를 읽고 쓰기 API는 호출하지 않는다.
 */

const PAGE_SIZE = 500;

const UNLINKED_PERMISSION: ContactsPermissionSnapshot = {
  status: 'unsupported',
  granted: false,
  canAskAgain: false,
};

type BulkContact = {
  id?: string;
  fullName?: string | null;
  givenName?: string | null;
  familyName?: string | null;
  company?: string | null;
  phones?: { number?: string | null }[] | null;
};

export async function readContactsPermission(): Promise<ContactsPermissionSnapshot> {
  return UNLINKED_PERMISSION;
}

export async function requestContactsPermission(): Promise<ContactsPermissionSnapshot> {
  return UNLINKED_PERMISSION;
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

export function mapBulkContact(row: BulkContact): DeviceContactDraft | null {
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

/** 네이티브 주소록이 연결되어 있지 않으면 빈 페이지를 반환한다. */
async function loadAddressBookPage(
  _offset: number,
  _limit: number,
): Promise<BulkContact[]> {
  return [];
}

/** 페이지 단위로 읽어 UI 스레드를 한 번씩 넘긴다. 고객 API는 호출하지 않는다. */
export async function readDeviceAddressBook(): Promise<DeviceContactDraft[]> {
  if (Platform.OS === 'web') {
    return [];
  }
  const drafts: DeviceContactDraft[] = [];
  let offset = 0;
  for (;;) {
    const page = await loadAddressBookPage(offset, PAGE_SIZE);
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
