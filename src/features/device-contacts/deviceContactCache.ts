import { Directory, File, Paths } from 'expo-file-system';

import {
  DEVICE_CONTACT_CACHE_SCHEMA_VERSION,
  type CachedDeviceContact,
  type CustomerPhoneRef,
  type PersistedDeviceContactCache,
} from './deviceContactTypes';

export type DeviceContactCachePort = {
  read(accountKey: string): Promise<PersistedDeviceContactCache | null>;
  write(accountKey: string, value: PersistedDeviceContactCache): Promise<void>;
  purgeAll(): Promise<void>;
};

const CACHE_DIRECTORY_NAME = 'device-contacts';

function cacheDirectory(): Directory {
  return new Directory(Paths.cache, CACHE_DIRECTORY_NAME);
}

function safeFileName(accountKey: string): string {
  const safe = accountKey.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
  return `${safe || 'account'}.json`;
}

function cacheFile(accountKey: string): File {
  return new File(cacheDirectory(), safeFileName(accountKey));
}

function isMatchState(value: unknown): value is CachedDeviceContact['matchState'] {
  return value === 'customer' || value === 'unregistered' || value === 'duplicate';
}

function readStringList(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const rows: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') {
      return null;
    }
    rows.push(item);
  }
  return rows;
}

function readCachedContact(value: unknown): CachedDeviceContact | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const row = value as Record<string, unknown>;
  const phones = readStringList(row.phones);
  const normalizedPhones = readStringList(row.normalizedPhones);
  if (
    typeof row.contactId !== 'string'
    || typeof row.displayName !== 'string'
    || typeof row.organization !== 'string'
    || !phones
    || !normalizedPhones
    || !isMatchState(row.matchState)
  ) {
    return null;
  }
  return {
    contactId: row.contactId,
    displayName: row.displayName,
    phones,
    organization: row.organization,
    normalizedPhones,
    matchState: row.matchState,
  };
}

function readCustomer(value: unknown): CustomerPhoneRef | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const row = value as Record<string, unknown>;
  const id = Number(row.id);
  if (!Number.isInteger(id) || id < 1 || typeof row.name !== 'string' || typeof row.normalizedPhone !== 'string') {
    return null;
  }
  return { id, name: row.name, normalizedPhone: row.normalizedPhone };
}

export function parseDeviceContactCache(
  raw: string,
  accountKey: string,
): PersistedDeviceContactCache | null {
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object') {
    return null;
  }
  const row = parsed as Record<string, unknown>;
  if (row.schemaVersion !== DEVICE_CONTACT_CACHE_SCHEMA_VERSION || row.accountKey !== accountKey) {
    return null;
  }
  if (!Array.isArray(row.contacts) || !Array.isArray(row.customers)) {
    return null;
  }
  const contacts: CachedDeviceContact[] = [];
  for (const item of row.contacts) {
    const contact = readCachedContact(item);
    if (!contact) {
      return null;
    }
    contacts.push(contact);
  }
  const customers: CustomerPhoneRef[] = [];
  for (const item of row.customers) {
    const customer = readCustomer(item);
    if (!customer) {
      return null;
    }
    customers.push(customer);
  }
  return {
    schemaVersion: DEVICE_CONTACT_CACHE_SCHEMA_VERSION,
    accountKey,
    contacts,
    customers,
    customerIndexTruncated: row.customerIndexTruncated === true,
  };
}

export const fileDeviceContactCache: DeviceContactCachePort = {
  async read(accountKey) {
    const file = cacheFile(accountKey);
    if (!file.exists) {
      return null;
    }
    try {
      const parsed = parseDeviceContactCache(await file.text(), accountKey);
      if (parsed) {
        return parsed;
      }
    } catch {
      // 깨진 캐시는 아래에서 지운다.
    }
    file.delete();
    return null;
  },
  async write(accountKey, value) {
    const directory = cacheDirectory();
    if (!directory.exists) {
      directory.create({ intermediates: true, idempotent: true });
    }
    const file = cacheFile(accountKey);
    if (!file.exists) {
      file.create({ overwrite: true });
    }
    file.write(JSON.stringify(value));
  },
  async purgeAll() {
    const directory = cacheDirectory();
    if (!directory.exists) {
      return;
    }
    directory.delete();
  },
};

export function createMemoryDeviceContactCache(): DeviceContactCachePort & {
  snapshot(): Map<string, PersistedDeviceContactCache>;
} {
  const rows = new Map<string, PersistedDeviceContactCache>();
  return {
    snapshot() {
      return rows;
    },
    async read(accountKey) {
      const value = rows.get(accountKey);
      return value ? structuredClone(value) : null;
    },
    async write(accountKey, value) {
      rows.set(accountKey, structuredClone(value));
    },
    async purgeAll() {
      rows.clear();
    },
  };
}
