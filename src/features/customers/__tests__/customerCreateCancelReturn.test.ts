/* eslint-disable @typescript-eslint/no-require-imports */
const { readFileSync } = require('fs') as { readFileSync(p: string, e: string): string };
const { join } = require('path') as { join(...p: string[]): string };
declare const __dirname: string;
import { customerCreateCancelPath } from '../customerWorkspaceNavigation';

describe('P2-2 customer create cancel returns to origin', () => {
  it('list entry returns to /customers, contact entry to /device-contacts', () => {
    expect(customerCreateCancelPath(undefined)).toBe('/customers');
    expect(customerCreateCancelPath('contact')).toBe('/device-contacts');
    expect(customerCreateCancelPath(['contact'])).toBe('/device-contacts');
    expect(customerCreateCancelPath('other')).toBe('/customers');
  });
  it('create cancel does not use router.back (Drawer firstRoute → home)', () => {
    const src = readFileSync(join(__dirname, '../CustomerFormScreen.tsx'), 'utf8');
    expect(src).toContain('router.replace(customerCreateCancelPath(entrySource)');
  });
});
