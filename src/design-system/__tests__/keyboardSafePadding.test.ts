import { resolveSafeFooterPadding } from '../components/SafeFooter';
import { scrollOffsetToReveal } from '../keyboardScroll';

describe('resolveSafeFooterPadding', () => {
  it('adds the nav inset while the keyboard is closed', () => {
    expect(resolveSafeFooterPadding(0, 48, false)).toBe(48);
    expect(resolveSafeFooterPadding(16, 48, false)).toBe(64);
  });
  it('drops the nav inset while the keyboard is open (footer sits on the keyboard)', () => {
    expect(resolveSafeFooterPadding(0, 48, true)).toBe(0);
    expect(resolveSafeFooterPadding(16, 48, true)).toBe(16);
  });
});

describe('scrollOffsetToReveal', () => {
  const viewportHeight = 790;
  it('keeps a visible field where it is', () => {
    expect(scrollOffsetToReveal({ fieldTop: 100, fieldHeight: 140, viewportHeight, scrollY: 0 })).toBeNull();
  });
  it('scrolls back up to a field pushed above the viewport (schedule 제목 case)', () => {
    expect(scrollOffsetToReveal({ fieldTop: -191, fieldHeight: 147, viewportHeight, scrollY: 400 })).toBe(400 - 191 - 16);
  });
  it('scrolls down just enough for a field hidden below the viewport', () => {
    expect(scrollOffsetToReveal({ fieldTop: 700, fieldHeight: 140, viewportHeight, scrollY: 50 })).toBe(50 + 840 - 790 + 16);
  });
  it('never returns a negative offset', () => {
    expect(scrollOffsetToReveal({ fieldTop: -10, fieldHeight: 40, viewportHeight, scrollY: 0 })).toBe(0);
  });
  it('aligns a field taller than the viewport to its top', () => {
    expect(scrollOffsetToReveal({ fieldTop: 300, fieldHeight: 1000, viewportHeight, scrollY: 0 })).toBe(284);
  });
});
