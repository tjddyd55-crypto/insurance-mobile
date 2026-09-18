import {
  DEVELOPMENT_APP_IDENTITY,
  PRODUCTION_APP_IDENTITY,
  RELEASE_STORE_BUILD_NUMBER,
  RELEASE_VERSION_NAME,
} from '../releasePreflightExpectations';

describe('releasePreflightExpectations', () => {
  it('defines the 1.0.3 store build contract', () => {
    expect(RELEASE_VERSION_NAME).toBe('1.0.3');
    expect(RELEASE_STORE_BUILD_NUMBER).toBe(6);
  });

  it('keeps production and development identities isolated', () => {
    expect(PRODUCTION_APP_IDENTITY.applicationId).toBe('com.onefc.app');
    expect(DEVELOPMENT_APP_IDENTITY.applicationId).toBe('com.onefc.app.dev');
    expect(PRODUCTION_APP_IDENTITY.scheme).toBe('onefc');
    expect(DEVELOPMENT_APP_IDENTITY.scheme).toBe('onefc-dev');
    expect(PRODUCTION_APP_IDENTITY.apiHostFragment).toContain('production');
    expect(DEVELOPMENT_APP_IDENTITY.apiHostFragment).toContain('dev');
  });
});
