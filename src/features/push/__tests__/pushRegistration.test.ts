import {
  buildPushDeviceRegistrationBody,
  resolvePushAppPackage,
  resolvePushPlatform,
} from '../pushRegistration';
import { getEnvironmentConfig } from '../../../config/environment';

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
