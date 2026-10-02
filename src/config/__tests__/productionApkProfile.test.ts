// @ts-nocheck
/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '../../..');

describe('production-apk profile', () => {
  const eas = JSON.parse(fs.readFileSync(path.join(root, 'eas.json'), 'utf8'));
  const appConfig = fs.readFileSync(path.join(root, 'app.config.ts'), 'utf8');

  it('builds an internal production package apk on the native-qa channel', () => {
    const profile = eas.build['production-apk'];
    expect(profile.distribution).toBe('internal');
    expect(profile.channel).toBe('native-qa');
    expect(profile.environment).toBe('production');
    expect(profile.env).toEqual({
      APP_VARIANT: 'production',
      EXPO_PUBLIC_APP_ENV: 'production',
    });
    expect(profile.env).toEqual(eas.build.production.env);
    expect(profile.android.buildType).toBe('apk');
  });

  it('ships production 1.0.4 from local version numbers on native-production', () => {
    expect(eas.cli.appVersionSource).toBe('local');
    expect(eas.build.production.channel).toBe('native-production');
    expect(eas.build.production.env).toEqual({
      APP_VARIANT: 'production',
      EXPO_PUBLIC_APP_ENV: 'production',
    });
    expect(appConfig).toContain("const appVersion = isProduction ? '1.0.4' : '1.0.0'");
    expect(appConfig).toContain('const androidVersionCode = isProduction ? 9 : 1');
    expect(appConfig).toContain("const iosBuildNumber = isProduction ? '9' : '1'");
    expect(appConfig).toContain("policy: 'appVersion'");
    const identity = JSON.parse(fs.readFileSync(path.join(root, 'app.identity.json'), 'utf8'));
    expect(identity.production.applicationId).toBe('com.onefc.app');
  });

  it('leaves the existing build profiles unchanged', () => {
    expect(eas.build.preview.env).toEqual({
      APP_VARIANT: 'development',
      EXPO_PUBLIC_APP_ENV: 'development',
    });
    expect(eas.build.preview.android.buildType).toBe('apk');
    expect(eas.build.preview.channel).toBe('native-preview');
    expect(eas.build.production.distribution).toBe('store');
    expect(eas.build.production.channel).toBe('native-production');
    expect(eas.build.production.android.buildType).toBe('app-bundle');
    expect(eas.build['production-staging'].channel).toBe('native-production-staging');
    expect(eas.build['production-staging'].android.buildType).toBe('app-bundle');
    expect(eas.build['production-apk'].channel).not.toBe(eas.build.production.channel);
  });

  it('keeps expo-sharing as a plugin and does not register expo-print', () => {
    const plugins = appConfig.slice(appConfig.indexOf('plugins: ['), appConfig.indexOf('experiments:'));
    expect(plugins).toContain("'expo-sharing'");
    expect(plugins).not.toContain("'expo-print'");
  });
});
