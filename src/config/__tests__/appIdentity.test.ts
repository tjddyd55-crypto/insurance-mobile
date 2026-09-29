import {
  getAppIdentity,
  resolveBuildEnvironment,
} from '../appIdentity';

describe('app identity', () => {
  test.each(['development', 'dev', 'device', 'local-device'])(
    'maps %s to the single DEV application identity',
    (variant) => {
      const environment = resolveBuildEnvironment(variant, 'development');
      expect(environment).toBe('development');
      expect(getAppIdentity(environment)).toEqual({
        displayName: 'ONE FC DEV',
        applicationId: 'com.onefc.app.dev',
        scheme: 'onefc-dev',
      });
    },
  );

  test('keeps the production application identity unchanged', () => {
    const environment = resolveBuildEnvironment('production', 'production');
    expect(environment).toBe('production');
    expect(getAppIdentity(environment)).toEqual({
      displayName: 'ONE FC',
      applicationId: 'com.onefc.app',
      scheme: 'onefc',
    });
  });

  test('defaults unknown and missing variants to development', () => {
    expect(resolveBuildEnvironment('', '')).toBe('development');
    expect(resolveBuildEnvironment('native', '')).toBe('development');
  });
});
