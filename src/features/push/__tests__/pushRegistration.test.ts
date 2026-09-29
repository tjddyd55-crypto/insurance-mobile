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
  resolvePushPlatform,
  syncPushRegistrationIfPermitted,
} from '../pushRegistration';
import { getEnvironmentConfig } from '../../../config/environment';
import { apiRequest } from '../../../api/client';

describe('pushRegistration', () => {
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
