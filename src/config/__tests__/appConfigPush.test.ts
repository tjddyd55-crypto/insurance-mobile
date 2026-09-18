// @ts-nocheck
const fs = require('fs');
const path = require('path');

describe('appConfigPush', () => {
  it('keeps ios bundle identifiers and android google services policy', () => {
    const appConfig = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'app.config.ts'), 'utf8');
    const identity = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', '..', '..', 'app.identity.json'), 'utf8'),
    );
    expect(identity.development.applicationId).toBe('com.onefc.app.dev');
    expect(identity.production.applicationId).toBe('com.onefc.app');
    expect(appConfig).toMatch(/bundleIdentifier: identity\.applicationId/);
    expect(appConfig).toMatch(/android:\s*\{[\s\S]*googleServicesFile/);
    const iosBlock = appConfig.match(/ios:\s*\{([\s\S]*?)\n    \},/)?.[1] ?? '';
    expect(iosBlock).not.toMatch(/googleServicesFile/);
  });

  it('does not commit production GoogleService-Info plist paths', () => {
    const gitignore = fs.readFileSync(path.join(__dirname, '..', '..', '..', '.gitignore'), 'utf8');
    expect(gitignore).toMatch(/GoogleService-Info\.plist/);
  });
});
