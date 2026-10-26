// @ts-nocheck
import { resolveBottomSafeInset } from '../../../design-system/useBottomSafeInset';
import { layout, spacing } from '../../../design-system/foundations';

import fs from 'fs';
import path from 'path';

describe('BinderViewer 전체 PDF controls clear the 3-button nav bar (P1-4)', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'BinderViewerScreen.tsx'), 'utf8');

  it('controls are rendered in SafeFooter (bottom inset applied), not a plain View', () => {
    expect(src).toMatch(/<SafeFooter style=\{styles\.controls\} basePadding=\{theme\.spacing\.lg\}>/);
    const controls = src.slice(src.indexOf('controls: {'), src.indexOf('}', src.indexOf('controls: {')));
    expect(controls).not.toMatch(/paddingBottom/);
  });

  it('android fallback inset (insets.bottom=0) is at least the 48dp 3-button nav bar', () => {
    expect(resolveBottomSafeInset(0, 'android', layout.contentBottomInset)).toBeGreaterThanOrEqual(48);
    // real insets win when reported
    expect(resolveBottomSafeInset(48, 'android', layout.contentBottomInset)).toBe(48);
    expect(spacing.lg + layout.contentBottomInset).toBeGreaterThanOrEqual(48 + spacing.lg);
  });
});
