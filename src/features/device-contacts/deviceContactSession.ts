import { assignMatchStates, buildDeviceContactRecords, customerPhoneRefs } from './deviceContactMatch';
import { sortDeviceContacts } from './deviceContactQuery';
import {
  createMemoryDeviceContactCache,
  fileDeviceContactCache,
  type DeviceContactCachePort,
} from './deviceContactCache';
import {
  DEVICE_CONTACT_CACHE_SCHEMA_VERSION,
  type CachedDeviceContact,
  type CustomerPhoneRef,
  type DeviceContactDraft,
  type DeviceContactRecord,
  type PersistedDeviceContactCache,
} from './deviceContactTypes';

export type DeviceContactSnapshot = {
  accountKey: string | null;
  contacts: DeviceContactRecord[];
  customers: CustomerPhoneRef[];
  customerIndexTruncated: boolean;
  cacheWrite: 'idle' | 'ok' | 'failed';
};

type Listener = () => void;

function emptySnapshot(): DeviceContactSnapshot {
  return {
    accountKey: null,
    contacts: [],
    customers: [],
    customerIndexTruncated: false,
    cacheWrite: 'idle',
  };
}

function cachedContacts(contacts: readonly DeviceContactRecord[]): CachedDeviceContact[] {
  return contacts.map((contact) => ({
    contactId: contact.contactId,
    displayName: contact.displayName,
    phones: contact.phones,
    organization: contact.organization,
    normalizedPhones: contact.normalizedPhones,
    matchState: contact.matchState,
  }));
}

function draftsFromCache(contacts: readonly CachedDeviceContact[]): DeviceContactDraft[] {
  return contacts.map((contact) => ({
    contactId: contact.contactId,
    displayName: contact.displayName,
    phones: contact.phones,
    organization: contact.organization,
  }));
}

export function createDeviceContactStore(port: DeviceContactCachePort) {
  let current = emptySnapshot();
  let pendingCustomers = new Map<number, CustomerPhoneRef[]>();
  let writeTask: Promise<void> = Promise.resolve();
  let generation = 0;
  const listeners = new Set<Listener>();

  function emit(): void {
    for (const listener of listeners) {
      listener();
    }
  }

  function rememberPending(customerId: number, refs: CustomerPhoneRef[]): void {
    if (refs.length === 0) {
      pendingCustomers.delete(customerId);
      return;
    }
    pendingCustomers.set(customerId, refs);
  }

  function mergeServerCustomers(serverCustomers: readonly CustomerPhoneRef[]): CustomerPhoneRef[] {
    const serverIds = new Set(serverCustomers.map((customer) => customer.id));
    for (const customerId of [...pendingCustomers.keys()]) {
      if (serverIds.has(customerId)) {
        pendingCustomers.delete(customerId);
      }
    }
    const pending = [...pendingCustomers.values()].flat();
    return [...serverCustomers, ...pending];
  }

  function replaceContacts(customers: readonly CustomerPhoneRef[], drafts: readonly DeviceContactDraft[]): DeviceContactRecord[] {
    return sortDeviceContacts(buildDeviceContactRecords(drafts, customers));
  }

  function persist(snapshot: DeviceContactSnapshot): void {
    if (!snapshot.accountKey) {
      return;
    }
    const ticket = generation;
    const accountKey = snapshot.accountKey;
    const payload: PersistedDeviceContactCache = {
      schemaVersion: DEVICE_CONTACT_CACHE_SCHEMA_VERSION,
      accountKey,
      contacts: cachedContacts(snapshot.contacts),
      customers: snapshot.customers,
      customerIndexTruncated: snapshot.customerIndexTruncated,
    };
    writeTask = writeTask.then(async () => {
      if (ticket !== generation) {
        return;
      }
      try {
        await port.write(accountKey, payload);
        if (ticket !== generation || current.accountKey !== accountKey || current.cacheWrite === 'ok') {
          return;
        }
        current = { ...current, cacheWrite: 'ok' };
        emit();
      } catch {
        if (ticket === generation && current.accountKey === accountKey) {
          current = { ...current, cacheWrite: 'failed' };
          emit();
        }
      }
    });
  }

  function commit(next: DeviceContactSnapshot, shouldPersist: boolean): void {
    current = next;
    emit();
    if (shouldPersist) {
      persist(next);
    }
  }

  return {
    subscribe(listener: Listener): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot(): DeviceContactSnapshot {
      return current;
    },
    async flush(): Promise<void> {
      await writeTask;
    },
    async hydrate(accountKey: string): Promise<void> {
      const stored = await port.read(accountKey);
      if (!stored) {
        commit({ ...emptySnapshot(), accountKey }, false);
        return;
      }
      const customers = mergeServerCustomers(stored.customers);
      commit({
        accountKey,
        customers,
        contacts: replaceContacts(customers, draftsFromCache(stored.contacts)),
        customerIndexTruncated: stored.customerIndexTruncated,
        cacheWrite: 'ok',
      }, false);
    },
    publishAddressBook(input: {
      accountKey: string;
      raw: readonly DeviceContactDraft[];
      customers: readonly CustomerPhoneRef[];
      customerIndexTruncated: boolean;
    }): void {
      const customers = mergeServerCustomers(input.customers);
      commit({
        accountKey: input.accountKey,
        customers,
        contacts: replaceContacts(customers, input.raw),
        customerIndexTruncated: input.customerIndexTruncated,
        cacheWrite: current.cacheWrite === 'failed' ? 'failed' : 'idle',
      }, true);
    },
    noteRegistered(customer: { id: number; name: string; phone: string }): void {
      const refs = customerPhoneRefs(customer);
      rememberPending(customer.id, refs);
      const customers = [
        ...current.customers.filter((row) => row.id !== customer.id),
        ...refs,
      ];
      const drafts = current.contacts.map((contact) => ({
        contactId: contact.contactId,
        displayName: contact.displayName,
        phones: contact.phones,
        organization: contact.organization,
      }));
      commit({
        ...current,
        customers,
        contacts: drafts.length ? replaceContacts(customers, drafts) : current.contacts,
      }, Boolean(current.accountKey));
    },
    rematchContact(contactId: string): DeviceContactRecord | null {
      const refreshed = assignMatchStates(current.contacts, current.customers);
      return refreshed.find((row) => row.contactId === contactId) ?? null;
    },
    async purge(): Promise<void> {
      generation += 1;
      pendingCustomers = new Map();
      commit(emptySnapshot(), false);
      await writeTask;
      await port.purgeAll();
    },
  };
}

export type DeviceContactStore = ReturnType<typeof createDeviceContactStore>;

export const deviceContactStore = createDeviceContactStore(fileDeviceContactCache);

export async function purgeDeviceContactCache(): Promise<void> {
  await deviceContactStore.purge();
}

export function noteDeviceContactCustomerRegistered(customer: {
  id: number;
  name: string;
  phone: string;
}): void {
  deviceContactStore.noteRegistered(customer);
}

/** 테스트가 파일 캐시 대신 메모리 저장소를 쓸 때. */
export function createDeviceContactStoreForTests(): {
  store: DeviceContactStore;
  cache: ReturnType<typeof createMemoryDeviceContactCache>;
} {
  const cache = createMemoryDeviceContactCache();
  return { store: createDeviceContactStore(cache), cache };
}
