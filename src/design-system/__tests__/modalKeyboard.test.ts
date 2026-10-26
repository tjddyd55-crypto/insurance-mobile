// @ts-nocheck
import { consumeBackForKeyboard, resolveModalKeyboardLayout } from '../modalKeyboard';

import fs from 'fs';
import path from 'path';

const base = {
  isDialog: true,
  keyboardOpen: true,
  platform: 'android',
  keyboardOverlap: 300,
  resizedBy: 0,
  keyboardInset: 300,
  safeBottom: 48,
  gap: 8,
  modalPadding: 16,
};

describe('resolveModalKeyboardLayout (P1-2)', () => {
  it('android dialog: lifts the overlay by the keyboard overlap + gap, no footer double count', () => {
    expect(resolveModalKeyboardLayout(base)).toEqual({ rootPaddingBottom: 308, dialogFooterPaddingBottom: null });
  });
  it('android dialog: subtracts any real window resize', () => {
    expect(resolveModalKeyboardLayout({ ...base, resizedBy: 100 }).rootPaddingBottom).toBe(208);
    expect(resolveModalKeyboardLayout({ ...base, resizedBy: 400 }).rootPaddingBottom).toBe(8);
  });
  it('keyboard closed: no change to dialog or fullscreen layout', () => {
    for (const isDialog of [true, false]) {
      for (const platform of ['android', 'ios']) {
        expect(resolveModalKeyboardLayout({ ...base, isDialog, platform, keyboardOpen: false })).toEqual({
          rootPaddingBottom: null,
          dialogFooterPaddingBottom: null,
        });
      }
    }
  });
  it('android fullscreen keeps previous behaviour', () => {
    expect(resolveModalKeyboardLayout({ ...base, isDialog: false, resizedBy: 50 }).rootPaddingBottom).toBe(250);
    expect(resolveModalKeyboardLayout({ ...base, isDialog: false, resizedBy: 300 }).rootPaddingBottom).toBeNull();
  });
  it('ios dialog keeps previous footer padding', () => {
    expect(resolveModalKeyboardLayout({ ...base, platform: 'ios' })).toEqual({
      rootPaddingBottom: null,
      dialogFooterPaddingBottom: 260,
    });
  });
});

describe('consumeBackForKeyboard', () => {
  it('first Back with keyboard open only dismisses the keyboard', () => {
    const kb = { isVisible: jest.fn(() => true), dismiss: jest.fn() };
    expect(consumeBackForKeyboard(kb)).toBe(true);
    expect(kb.dismiss).toHaveBeenCalledTimes(1);
  });
  it('Back with keyboard closed is not consumed', () => {
    const kb = { isVisible: jest.fn(() => false), dismiss: jest.fn() };
    expect(consumeBackForKeyboard(kb)).toBe(false);
    expect(kb.dismiss).not.toHaveBeenCalled();
  });
});

describe('source wiring', () => {
  const read = (p) => fs.readFileSync(path.join(__dirname, '..', '..', '..', p), 'utf8');
  it('ModalShell uses the shared keyboard layout + back helper, applied after dialog paddingVertical', () => {
    const src = read('src/design-system/components/ModalShell.tsx');
    expect(src).toMatch(/resolveModalKeyboardLayout\(/);
    expect(src).toMatch(/consumeBackForKeyboard\(\)/);
    expect(src.indexOf('keyboardLayout.rootPaddingBottom !== null')).toBeGreaterThan(
      src.indexOf('paddingVertical: dialogOverlayPaddingVertical'),
    );
    expect(src).not.toMatch(/keyboardInset - insets\.bottom/);
  });
  it('AddressSearchModal (M43) consumes Back for the keyboard first', () => {
    const src = read('src/components/address-search/AddressSearchModal.tsx');
    expect(src).toMatch(/onRequestClose=\{\(\) => \{\s*\/\/[^\n]*\n\s*if \(consumeBackForKeyboard\(\)\) return;\s*onClose\(\);/);
  });
});
