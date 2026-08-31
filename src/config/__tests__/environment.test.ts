import {
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
});
