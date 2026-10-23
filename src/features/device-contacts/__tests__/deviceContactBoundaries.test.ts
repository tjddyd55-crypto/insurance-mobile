// @ts-nocheck
import { readFileSync } from 'fs';
import { join } from 'path';

import { resolveFeatureKeyFromPath } from '../../entitlements/featureRoutePolicy';
import { FEATURE_KEYS } from '../../entitlements/featureEntitlementPolicy';

const root = join(__dirname, '..', '..', '..', '..');
const read = (relative: string) => readFileSync(join(root, relative), 'utf8');

describe('device contact boundaries', () => {
  it('declares READ_CONTACTS and the contacts module, and does not declare write or telephony permissions', () => {
    const config = read('app.config.ts');
    const packageJson = read('package.json');
    const permissions = config.slice(
      config.indexOf('permissions: ['),
      config.indexOf('],', config.indexOf('permissions: [')),
    );
    expect(permissions).toContain("'POST_NOTIFICATIONS'");
    expect(permissions).toContain("'ACCESS_COARSE_LOCATION'");
    expect(permissions).toContain("'ACCESS_FINE_LOCATION'");
    expect(permissions).toContain("'READ_CONTACTS'");
    expect(permissions).not.toContain('WRITE_CONTACTS');
    expect(config).toContain('NSContactsUsageDescription');
    expect(config).toContain('휴대폰 연락처를 ONE FC에서 확인하려면 연락처 접근 권한이 필요합니다.');
    expect(config).toContain('expo-contacts');
    expect(config).toContain('withContactsReadOnly');
    expect(config).not.toContain('READ_SMS');
    expect(config).not.toContain('SEND_SMS');
    expect(config).not.toContain('READ_CALL_LOG');
    expect(config).not.toContain('WRITE_CALL_LOG');
    expect(config).not.toContain('CALL_PHONE');
    expect(packageJson).toContain('"expo-contacts"');
    const plugin = read('plugins/withContactsReadOnly.js');
    expect(plugin).toContain('WRITE_CONTACTS');
    expect(plugin).toContain("tools:node");
    expect(plugin).toContain('remove');
  });

  it('keeps permission and address-book reads in the source wrapper and does not write contacts', () => {
    const source = read('src/features/device-contacts/deviceContactsSource.ts');
    expect(source).toMatch(/from ['"]expo-contacts['"]/);
    expect(source).toContain('Contact.getAllDetails');
    expect(source).toContain('requestPermissionsAsync');
    expect(source).toContain('getPermissionsAsync');
    expect(source).toContain('readDeviceAddressBook');
    expect(source).not.toMatch(/addContact|updateContact|removeContact|presentFormAsync|writeContact/);
    expect(source).not.toMatch(/console\.(log|debug|info|warn)/);
  });

  it('purges the contact cache on logout and account switch', () => {
    const auth = read('src/auth/AuthProvider.tsx');
    const clearStart = auth.indexOf('const clearLocalSession');
    const loginStart = auth.indexOf('const login = useCallback');
    expect(auth.slice(clearStart, loginStart)).toContain('await purgeDeviceContactCache()');
    expect(auth.slice(loginStart)).toContain('await purgeDeviceContactCache()');
    expect(read('src/features/device-contacts/deviceContactSession.ts')).not.toContain('expo-contacts');
  });

  it('hides the contacts menu and shows a closed notice instead of the list', () => {
    expect(resolveFeatureKeyFromPath('/device-contacts')).toBe(FEATURE_KEYS.CUSTOMERS);
    const menu = read('src/navigation/menuConfig.ts');
    expect(menu).toContain('deviceContacts: false');
    expect(menu).toContain('USER_MENU_FEATURE_FLAGS.deviceContacts');
    const start = menu.indexOf("id: 'device-contacts'");
    const block = menu.slice(start, start + 400);
    expect(block).toContain("label: '연락처'");
    expect(block).not.toContain('badge:');
    const route = read('app/(app)/device-contacts/index.tsx');
    expect(route).toContain('USER_MENU_FEATURE_FLAGS.deviceContacts');
    expect(route).toContain('연락처 화면은 준비 중입니다.');
    expect(route).toContain('showBack');
    expect(route).toContain('<DeviceContactsScreen />');
    expect(route).not.toContain('return null');
    expect(route).not.toContain('requestPermissionsAsync');
    expect(route).not.toContain('expo-contacts');
  });
});
