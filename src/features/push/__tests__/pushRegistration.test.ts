jest.mock('expo-device', () => ({
  isDevice: true,
  osInternalBuildId: 'test-build',
}));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  getDevicePushTokenAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  AndroidImportance: { HIGH: 4 },
}));

jest.mock('../../../api/client', () => ({
  apiRequest: jest.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

import * as Notifications from 'expo-notifications';

import {
  buildPushDeviceRegistrationBody,
  resolvePushAppPackage,
  registerPushDeviceWithServer,
  resetPushRegistrationDedupe,
  resolvePushPlatform,
  syncPushRegistrationIfPermitted,
  unregisterPushDeviceWithServer,
  PUSH_REGISTER_DEDUPE_MS,
} from '../pushRegistration';
import { getEnvironmentConfig } from '../../../config/environment';
import { apiRequest } from '../../../api/client';

describe('pushRegistration', () => {
  beforeEach(() => {
    resetPushRegistrationDedupe();
    (apiRequest as jest.Mock).mockReset();
  });

  const registerCalls = () =>
    (apiRequest as jest.Mock).mock.calls.filter((c) => c[0] === '/api/push/devices/register').length;

  it('같은 로그인+같은 기기 토큰 동시 요청은 POST 1회를 공유', async () => {
    let resolve!: (v: unknown) => void;
    (apiRequest as jest.Mock).mockReturnValue(new Promise((r) => (resolve = r)));
    const a = registerPushDeviceWithServer({ authToken: 'a1', deviceToken: 'd1' });
    const b = registerPushDeviceWithServer({ authToken: 'a1', deviceToken: 'd1' });
    resolve({ ok: true });
    await expect(Promise.all([a, b])).resolves.toEqual([true, true]);
    expect(registerCalls()).toBe(1);
  });

  it('성공 후 60초 안 반복은 생략, 지나거나 토큰/로그인이 다르면 다시 등록', async () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
    (apiRequest as jest.Mock).mockResolvedValue({ ok: true });
    await registerPushDeviceWithServer({ authToken: 'a1', deviceToken: 'd1' });
    await registerPushDeviceWithServer({ authToken: 'a1', deviceToken: 'd1' });
    expect(registerCalls()).toBe(1);
    await registerPushDeviceWithServer({ authToken: 'a1', deviceToken: 'd2' });
    await registerPushDeviceWithServer({ authToken: 'a2', deviceToken: 'd1' });
    expect(registerCalls()).toBe(3);
    now.mockReturnValue(1_000_000 + PUSH_REGISTER_DEDUPE_MS);
    await registerPushDeviceWithServer({ authToken: 'a1', deviceToken: 'd1' });
    expect(registerCalls()).toBe(4);
    now.mockRestore();
  });

  it('실패는 기억하지 않고, 해제 후에는 다시 등록', async () => {
    (apiRequest as jest.Mock).mockRejectedValueOnce(new Error('net')).mockResolvedValue({ ok: true });
    await expect(registerPushDeviceWithServer({ authToken: 'a1', deviceToken: 'd1' })).resolves.toBe(false);
    await expect(registerPushDeviceWithServer({ authToken: 'a1', deviceToken: 'd1' })).resolves.toBe(true);
    await unregisterPushDeviceWithServer('a1');
    await registerPushDeviceWithServer({ authToken: 'a1', deviceToken: 'd1' });
    expect(registerCalls()).toBe(3);
  });

  it('maps ios and android platform values', () => {
    expect(resolvePushPlatform('ios')).toBe('IOS');
    expect(resolvePushPlatform('android')).toBe('ANDROID');
  });

  it('maps dev and prod app packages', () => {
    const dev = getEnvironmentConfig('development');
    const prod = getEnvironmentConfig('production');
    expect(resolvePushAppPackage('android', dev)).toBe('com.onefc.app.dev');
    expect(resolvePushAppPackage('ios', prod)).toBe('com.onefc.app');
  });

  it('registers when OS permission and device token are available', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Notifications.getDevicePushTokenAsync as jest.Mock).mockResolvedValue({ data: 'fcm-token-1' });
    (apiRequest as jest.Mock).mockResolvedValue({ ok: true });

    const ok = await syncPushRegistrationIfPermitted('auth-token');

    expect(ok).toBe(true);
    expect(apiRequest).toHaveBeenCalledWith(
      '/api/push/devices/register',
      expect.objectContaining({
        method: 'POST',
        token: 'auth-token',
      }),
    );
  });

  it('builds server registration payload without title fields', () => {
    expect(
      buildPushDeviceRegistrationBody({
        deviceToken: 'abc',
        platform: 'ANDROID',
        installationId: 'install-1',
        appPackage: 'com.onefc.app.dev',
        appVersion: '1.0.0',
      }),
    ).toEqual({
      token: 'abc',
      platform: 'ANDROID',
      installationId: 'install-1',
      appPackage: 'com.onefc.app.dev',
      appVersion: '1.0.0',
    });
  });
});
