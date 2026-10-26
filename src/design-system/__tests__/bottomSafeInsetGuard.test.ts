// @ts-nocheck
/* eslint-disable @typescript-eslint/no-require-imports */
const { readdirSync, readFileSync, statSync } = require('fs');
const { join, relative } = require('path');

/**
 * Guard: bottom system-nav insets must come from the design-system SSOT
 * (`useBottomSafeInset` / `SafeFooter` / `useSafeFooterPadding`). Raw
 * `insets.bottom` or SafeAreaView `bottom` edges report 0 on Android edge-to-edge
 * (and inside RN <Modal>), which lets footers overlap the navigation bar.
 */
const ROOT = join(__dirname, '..', '..', '..');
const SRC = join(ROOT, 'src');

// Pending migration (owned by other in-flight branches) or centered dialogs.
const ALLOWLIST = new Set([
  'src/features/todos/TodoFormScreen.tsx',
  'src/features/schedule/WidgetQuickAddSheet.tsx',
  'src/features/coverage-simulator/CustomerPickerDialog.tsx',
]);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === '__tests__' || name === 'design-system') continue;
      walk(full, out);
    } else if (/\.tsx?$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

describe('bottom safe inset guard', () => {
  it('has no raw bottom insets outside the design system', () => {
    const offenders = walk(SRC)
      .map((file) => relative(ROOT, file).split('\\').join('/'))
      .filter((rel) => !ALLOWLIST.has(rel))
      .filter((rel) => {
        const source = readFileSync(join(ROOT, rel), 'utf8');
        return /insets\.bottom/.test(source) || /edges=\{\[[^\]]*['"]bottom['"]/.test(source);
      });
    expect(offenders).toEqual([]);
  });
});
