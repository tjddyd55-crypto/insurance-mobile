/** 고객 1명의 번호 하나. 같은 고객이 번호를 여러 개 가지면 행이 늘어난다. */
export type CustomerPhoneRef = {
  id: number;
  name: string;
  normalizedPhone: string;
};

/** 주소록에서 읽은 최소 원본. 전화번호가 없어도 여기까지는 올 수 있다. */
export type DeviceContactDraft = {
  contactId: string;
  displayName: string;
  phones: string[];
  organization: string;
};

export type DeviceContactMatchState = 'customer' | 'unregistered' | 'duplicate';

/** 화면·캐시가 공유하는 연락처. 검색 키는 메모리에서만 다시 만든다. */
export type DeviceContactRecord = DeviceContactDraft & {
  normalizedPhones: string[];
  matchState: DeviceContactMatchState;
  matchedCustomerIds: number[];
  nameKey: string;
  companyKey: string;
  phoneKey: string;
};

export type DeviceContactFilter = 'all' | 'unregistered' | 'customer' | 'duplicate';

export const DEFAULT_DEVICE_CONTACT_FILTER: DeviceContactFilter = 'unregistered';

/** 디스크에 남기는 연락처. 토큰·이메일·메모·사진은 넣지 않는다. */
export type CachedDeviceContact = {
  contactId: string;
  displayName: string;
  phones: string[];
  organization: string;
  normalizedPhones: string[];
  matchState: DeviceContactMatchState;
};

export type PersistedDeviceContactCache = {
  schemaVersion: 1;
  accountKey: string;
  contacts: CachedDeviceContact[];
  customers: CustomerPhoneRef[];
  customerIndexTruncated: boolean;
};

export const DEVICE_CONTACT_CACHE_SCHEMA_VERSION = 1 as const;
