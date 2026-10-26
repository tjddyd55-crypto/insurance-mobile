const mockPlatform = { OS: 'android' as string };
const mockDevice: { modelName: string | null } = { modelName: 'SM-S931N' };
const mockConstants: { expoConfig: { version?: string } | null } = { expoConfig: { version: '1.0.4' } };

jest.mock('react-native', () => ({
  __esModule: true,
  Platform: {
    get OS() {
      return mockPlatform.OS;
    },
  },
}));
jest.mock('expo-device', () => ({
  __esModule: true,
  get modelName() {
    return mockDevice.modelName;
  },
}));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    get expoConfig() {
      return mockConstants.expoConfig;
    },
  },
}));
jest.mock('../../config/environment', () => ({
  getEnvironmentConfig: () => ({ apiBaseUrl: 'https://insurance-dev.up.railway.app' }),
  HTTPS_ONLY_API_HOSTS: [],
}));

import {
  __resetClientContextCacheForTests,
  buildClientContextHeaders,
  getClientContextHeaders,
  sanitizeHeaderValue,
} from '../clientContext';
import { apiRequest } from '../client';

const fetchMock = jest.fn();

function okResponse(body: unknown = {}) {
  return { ok: true, status: 200, json: async () => body } as unknown as Response;
}

beforeEach(() => {
  __resetClientContextCacheForTests();
  mockPlatform.OS = 'android';
  mockDevice.modelName = 'SM-S931N';
  mockConstants.expoConfig = { version: '1.0.4' };
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(okResponse({ ok: true }));
  (globalThis as unknown as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
});

function sentHeaders(call = 0): Record<string, string> {
  return fetchMock.mock.calls[call][1].headers as Record<string, string>;
}

describe('client context headers', () => {
  it('builds Android headers', () => {
    expect(buildClientContextHeaders({ os: 'android', appVersion: '1.0.4', deviceModel: 'SM-S931N' })).toEqual({
      'X-ONEFC-Client-Type': 'native_android',
      'X-ONEFC-Platform': 'android',
      'X-ONEFC-App-Version': '1.0.4',
      'X-ONEFC-Device-Model': 'SM-S931N',
    });
  });

  it('builds iOS headers', () => {
    expect(buildClientContextHeaders({ os: 'ios', appVersion: '1.0.4', deviceModel: 'iPhone 17 Pro' })).toEqual({
      'X-ONEFC-Client-Type': 'native_ios',
      'X-ONEFC-Platform': 'ios',
      'X-ONEFC-App-Version': '1.0.4',
      'X-ONEFC-Device-Model': 'iPhone 17 Pro',
    });
  });

  it('omits empty values and unknown platforms', () => {
    expect(buildClientContextHeaders({ os: 'web', appVersion: '  ', deviceModel: null })).toEqual({});
  });

  it('sanitizes control chars, whitespace and length', () => {
    expect(sanitizeHeaderValue(' SM-\nS931N\t ')).toBe('SM- S931N');
    expect(sanitizeHeaderValue('갤럭시')).toBeNull();
    expect(sanitizeHeaderValue('x'.repeat(100))).toHaveLength(64);
    expect(sanitizeHeaderValue(undefined)).toBeNull();
  });

  it('reads real app version / device model once and caches', () => {
    const first = getClientContextHeaders();
    mockDevice.modelName = 'Other';
    expect(getClientContextHeaders()).toBe(first);
    expect(first['X-ONEFC-Device-Model']).toBe('SM-S931N');
    expect(first['X-ONEFC-App-Version']).toBe('1.0.4');
  });

  it('iOS via runtime platform', () => {
    mockPlatform.OS = 'ios';
    mockDevice.modelName = 'iPhone 17 Pro';
    expect(getClientContextHeaders()['X-ONEFC-Client-Type']).toBe('native_ios');
  });
});

describe('apiRequest attaches telemetry headers', () => {
  it('on login (unauthenticated) request', async () => {
    await apiRequest('/api/auth/login', { method: 'POST', body: '{}' });
    const h = sentHeaders();
    expect(h['X-ONEFC-Client-Type']).toBe('native_android');
    expect(h.Authorization).toBeUndefined();
  });

  it('on authenticated requests and repeated /api/me session checks (refresh)', async () => {
    await apiRequest('/api/me', { token: 'tok' });
    await apiRequest('/api/me', { token: 'tok' });
    for (const i of [0, 1]) {
      const h = sentHeaders(i);
      expect(h.Authorization).toBe('Bearer tok');
      expect(h['X-ONEFC-App-Version']).toBe('1.0.4');
      expect(h['X-ONEFC-Device-Model']).toBe('SM-S931N');
      expect(h['X-ONEFC-Platform']).toBe('android');
      expect(h['Content-Type']).toBe('application/json');
    }
  });

  it('keeps caller headers working (regression)', async () => {
    await apiRequest('/api/x', { token: 'tok', headers: { 'Content-Type': 'text/plain', 'X-Custom': '1' } });
    const h = sentHeaders();
    expect(h['Content-Type']).toBe('text/plain');
    expect(h['X-Custom']).toBe('1');
    expect(h['X-ONEFC-Client-Type']).toBe('native_android');
  });
});
