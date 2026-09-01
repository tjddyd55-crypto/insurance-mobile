import {
  assertApiEnvironmentAffinity,
  getEnvironmentConfig,
  resolveApiBaseUrl,
  resolveAppEnvironment,
} from '../environment';

describe('environment', () => {
  it('defaults to development when unset', () => {
    expect(resolveAppEnvironment('', '')).toBe('development');
  });

  it('resolves production from explicit env name', () => {
    expect(resolveAppEnvironment('production', '')).toBe('production');
  });

  it('ignores an unknown build variant and uses the explicit environment', () => {
    expect(resolveAppEnvironment('production', 'unknown-variant')).toBe('production');
  });

  it('uses DEV and PROD API bases', () => {
    expect(resolveApiBaseUrl('development')).toContain('insurance-dev');
    expect(resolveApiBaseUrl('production')).toContain('insurance-production');
  });

  it('exposes DEV package identity', () => {
    const cfg = getEnvironmentConfig('development');
    expect(cfg.appDisplayName).toBe('ONE FC DEV');
    expect(cfg.androidPackage).toBe('com.onefc.app.dev');
    expect(cfg.scheme).toBe('onefc-dev');
  });

  it('rejects a DEV identity connected to the Production API', () => {
    expect(() => {
      assertApiEnvironmentAffinity(
        'development',
        'https://insurance-production-7bd8.up.railway.app',
        'https://insurance-production-7bd8.up.railway.app',
      );
    }).toThrow('DEV 앱은 Production API에 연결할 수 없습니다.');
  });
});
