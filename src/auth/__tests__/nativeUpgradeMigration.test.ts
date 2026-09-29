import * as SecureStore from 'expo-secure-store';

import { getEnvironmentConfig } from '../../config/environment';
import {
  NATIVE_MIGRATION_VERSION,
  consumeNativeUpgradeReLoginNotice,
  ensureNativeUpgradeMigration,
} from '../nativeUpgradeMigration';

jest.mock('expo-secure-store', () => {
  const mockStore = new Map<string, string>();
  return {
    setItemAsync: jest.fn(async (key: string, value: string) => {
      mockStore.set(key, value);
    }),
    getItemAsync: jest.fn(async (key: string) => mockStore.get(key) ?? null),
    deleteItemAsync: jest.fn(async (key: string) => {
      mockStore.delete(key);
    }),
    __mockStore: mockStore,
  };
});

type MockedSecureStore = typeof SecureStore & { __mockStore: Map<string, string> };

describe('nativeUpgradeMigration', () => {
  beforeEach(() => {
    (SecureStore as MockedSecureStore).__mockStore.clear();
    jest.clearAllMocks();
  });

  it('clears unscoped legacy keys once and requests re-login notice', async () => {
    const store = (SecureStore as MockedSecureStore).__mockStore;
    store.set('onefc.auth.token', 'stale');
    store.set('onefc.auth.userMeta', '{}');

    const first = await ensureNativeUpgradeMigration();
    expect(first.ran).toBe(true);
    expect(first.requireReLoginNotice).toBe(true);
    expect(store.get('onefc.auth.token')).toBeUndefined();
    expect(store.get(`onefc.nativeMigrationVersion.${getEnvironmentConfig().environment}`)).toBe(
      NATIVE_MIGRATION_VERSION,
    );

    const second = await ensureNativeUpgradeMigration();
    expect(second.ran).toBe(false);
    expect(await consumeNativeUpgradeReLoginNotice()).toBe(true);
    expect(await consumeNativeUpgradeReLoginNotice()).toBe(false);
  });
});
