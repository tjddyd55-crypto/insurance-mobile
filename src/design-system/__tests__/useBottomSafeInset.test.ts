import { resolveBottomSafeInset } from '../useBottomSafeInset';

describe('resolveBottomSafeInset', () => {
  it('returns ios inset as-is', () => {
    expect(resolveBottomSafeInset(34, 'ios')).toBe(34);
    expect(resolveBottomSafeInset(0, 'ios')).toBe(0);
  });

  it('uses android fallback when bottom inset is zero', () => {
    expect(resolveBottomSafeInset(0, 'android', 48)).toBe(48);
  });

  it('keeps positive android inset', () => {
    expect(resolveBottomSafeInset(24, 'android', 48)).toBe(24);
  });
});
