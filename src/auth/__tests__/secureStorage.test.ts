import * as SecureStore from 'expo-secure-store';

import {
  clearAuthSession,
  readAuthSession,
  saveAuthSession,
} from '../secureStorage';

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

describe('secureStorage', () => {
  beforeEach(() => {
    (SecureStore as MockedSecureStore).__mockStore.clear();
    jest.clearAllMocks();
  });

  it('saves and reads minimal session metadata', async () => {
    await saveAuthSession({
      token: 'jwt-token',
      user: {
        id: '1',
        username: 'demo',
        role: 'USER',
        gaId: 10,
        gaCode: 'GA',
        gaName: 'Demo GA',
        companyId: null,
        displayName: 'Demo',
        teamId: null,
        tenantCode: '',
        subscription: null,
      },
    });
    const session = await readAuthSession();
    expect(session?.token).toBe('jwt-token');
    expect(session?.user.username).toBe('demo');
    expect(session?.user.role).toBe('USER');
  });

  it('clears session', async () => {
    await saveAuthSession({
      token: 'jwt-token',
      user: {
        id: '1',
        username: 'demo',
        role: 'USER',
        gaId: 10,
        gaCode: 'GA',
        gaName: 'Demo GA',
        companyId: null,
        displayName: 'Demo',
        teamId: null,
        tenantCode: '',
        subscription: null,
      },
    });
    await clearAuthSession();
    expect(await readAuthSession()).toBeNull();
  });
});
