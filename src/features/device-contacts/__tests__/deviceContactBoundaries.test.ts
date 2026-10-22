// @ts-nocheck
import { readFileSync } from 'fs';
import { join } from 'path';

import { resolveFeatureKeyFromPath } from '../../entitlements/featureRoutePolicy';
import { FEATURE_KEYS } from '../../entitlements/featureEntitlementPolicy';

const root = join(__dirname, '..', '..', '..', '..');
const read = (relative: string) => readFileSync(join(root, relative), 'utf8');

describe('device contact boundaries', () => {
  it('does not declare contact permissions or the contacts native module', () => {
    const config = read('app.config.ts');
    const packageJson = read('package.json');
    const permissions = config.slice(
      config.indexOf('permissions: ['),
      config.indexOf('],', config.indexOf('permissions: [')),
    );
    expect(permissions).toContain("'POST_NOTIFICATIONS'");
    expect(permissions).toContain("'ACCESS_COARSE_LOCATION'");
    expect(permissions).toContain("'ACCESS_FINE_LOCATION'");
    expect(permissions).not.toContain('READ_CONTACTS');
    expect(permissions).not.toContain('WRITE_CONTACTS');
    expect(config).not.toContain('READ_CONTACTS');
    expect(config).not.toContain('WRITE_CONTACTS');
    expect(config).not.toContain('NSContactsUsageDescription');
    expect(config).not.toContain('expo-contacts');
    expect(config).not.toContain('withContactsReadOnly');
    expect(config).not.toContain('READ_SMS');
    expect(config).not.toContain('SEND_SMS');
    expect(config).not.toContain('READ_CALL_LOG');
    expect(config).not.toContain('CALL_PHONE');
    expect(packageJson).not.toContain('expo-contacts');
  });

  it('does not import the contacts native module from app code', () => {
    const source = read('src/features/device-contacts/deviceContactsSource.ts');
    expect(source).not.toMatch(/from ['"]expo-contacts['"]/);
    expect(source).not.toMatch(/require\(['"]expo-contacts['"]\)/);
    expect(source).not.toMatch(/Contact\.getAllDetails/);
    expect(source).not.toMatch(/\brequestPermissionsAsync\b/);
    expect(source).not.toMatch(/\bgetPermissionsAsync\b/);
    expect(source).toContain('loadAddressBookPage');
    expect(source).toContain("status: 'unsupported'");
  });

  it('purges the contact cache on logout and account switch', () => {
    const auth = read('src/auth/AuthProvider.tsx');
    const clearStart = auth.indexOf('const clearLocalSession');
    const loginStart = auth.indexOf('const login = useCallback');
    expect(auth.slice(clearStart, loginStart)).toContain('await purgeDeviceContactCache()');
    expect(auth.slice(loginStart)).toContain('await purgeDeviceContactCache()');
    expect(read('src/features/device-contacts/deviceContactSession.ts')).not.toContain('expo-contacts');
  });

  it('keeps the contacts screen behind one flag so the menu and route stay closed', () => {
    expect(resolveFeatureKeyFromPath('/device-contacts')).toBe(FEATURE_KEYS.CUSTOMERS);
    const menu = read('src/navigation/menuConfig.ts');
    expect(menu).toContain('deviceContacts: false');
    expect(menu).toContain('USER_MENU_FEATURE_FLAGS.deviceContacts');
    const start = menu.indexOf("id: 'device-contacts'");
    const block = menu.slice(start, start + 280);
    expect(block).toContain("label: '연락처'");
    expect(block).not.toContain('badge:');
    const route = read('app/(app)/device-contacts/index.tsx');
    expect(route).toContain('USER_MENU_FEATURE_FLAGS.deviceContacts');
    expect(route).toContain('return null');
    expect(route).toContain('<DeviceContactsScreen />');
    expect(route).not.toContain('requestPermissionsAsync');
    expect(route).not.toContain('expo-contacts');
  });
});
