// @ts-nocheck
import { readFileSync } from 'fs';
import { join } from 'path';

import { resolveFeatureKeyFromPath } from '../../entitlements/featureRoutePolicy';
import { FEATURE_KEYS } from '../../entitlements/featureEntitlementPolicy';

const root = join(__dirname, '..', '..', '..', '..');
const read = (relative: string) => readFileSync(join(root, relative), 'utf8');

describe('device contact boundaries', () => {
  it('removes WRITE_CONTACTS and keeps READ_CONTACTS', () => {
    // CJS config plugin. ESLint import style does not load this file.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const plugin = require('../../../../plugins/withContactsReadOnly') as {
      removeWriteContacts: (manifest: { manifest: Record<string, unknown> }) => { manifest: { 'uses-permission': { $: Record<string, string> }[] } };
    };
    const manifest = plugin.removeWriteContacts({
      manifest: {
        $: {},
        'uses-permission': [
          { $: { 'android:name': 'android.permission.READ_CONTACTS' } },
          { $: { 'android:name': 'android.permission.WRITE_CONTACTS' } },
        ],
      },
    });
    const names = manifest.manifest['uses-permission'].map((item) => item.$['android:name']);
    const write = manifest.manifest['uses-permission'].find((item) => item.$['android:name'] === 'android.permission.WRITE_CONTACTS');
    expect(names.filter((name) => name === 'android.permission.READ_CONTACTS')).toEqual(['android.permission.READ_CONTACTS']);
    expect(write?.$['tools:node']).toBe('remove');
    expect(names).not.toContain('android.permission.SEND_SMS');
  });

  it('declares only READ_CONTACTS as the new Android permission', () => {
    const config = read('app.config.ts');
    const permissions = config.slice(config.indexOf('permissions: ['), config.indexOf('],', config.indexOf('permissions: [')));
    expect(permissions).toContain("'READ_CONTACTS'");
    expect(permissions).not.toContain('WRITE_CONTACTS');
    expect(config).not.toContain('READ_SMS');
    expect(config).not.toContain('SEND_SMS');
    expect(config).not.toContain('READ_CALL_LOG');
    expect(config).not.toContain('CALL_PHONE');
    expect(config).toContain('NSContactsUsageDescription');
    expect(config).toContain('expo-contacts');
  });

  it('purges the contact cache on logout and account switch', () => {
    const auth = read('src/auth/AuthProvider.tsx');
    const clearStart = auth.indexOf('const clearLocalSession');
    const loginStart = auth.indexOf('const login = useCallback');
    expect(auth.slice(clearStart, loginStart)).toContain('await purgeDeviceContactCache()');
    expect(auth.slice(loginStart)).toContain('await purgeDeviceContactCache()');
  });

  it('uses the customer entitlement and does not add a menu count badge', () => {
    expect(resolveFeatureKeyFromPath('/device-contacts')).toBe(FEATURE_KEYS.CUSTOMERS);
    const menu = read('src/navigation/menuConfig.ts');
    const start = menu.indexOf("id: 'device-contacts'");
    const block = menu.slice(start, start + 280);
    expect(block).toContain("label: '연락처'");
    expect(block).not.toContain('badge:');
  });

  it('reads contacts in bulk and does not call the write API', () => {
    const source = read('src/features/device-contacts/deviceContactsSource.ts');
    expect(source).toContain('Contact.getAllDetails');
    expect(source).not.toContain('Contact.create');
    expect(source).not.toContain('.update(');
    expect(source).not.toContain('.delete(');
    expect(source).not.toContain('addPhone');
  });
});
