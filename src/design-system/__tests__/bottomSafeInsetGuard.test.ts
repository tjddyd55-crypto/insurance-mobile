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

// No exceptions: every screen uses the shared SafeFooter / ModalShell / Screen policy.
const ALLOWLIST = new Set<string>([]);

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

/**
 * Guard: a vertical page scroll (ScrollView / FlatList / SectionList) must sit in a container that
 * applies the nav-bar inset (`<Screen>` / `CoverageSimulatorScreen`) or use the SSOT hooks directly.
 * A plain `<View style={root}>` + scroll lets the last item hide behind the 3-button nav bar (/schedule P1).
 * `ModalShell` in the same file does NOT count: it only pads the modal, not the page list.
 */
const SAFE_CONTAINER = /<Screen\b|<SafeFooter\b|<CoverageSimulatorScreen\b|useSafeFooterPadding|useContentBottomPadding|useBottomSafeInset/;
// Files whose vertical scrolls live only inside ModalShell/centered dialogs, or are wrapped by their route's <Screen>.
const SCROLL_ALLOWLIST = new Map<string, string>([
  ['src/features/auth/LoginForm.tsx', 'wrapped by <Screen> in app/(auth)/login.tsx'],
  ['src/features/claims/ClaimCustomerPickerModal.tsx', 'scroll inside ModalShell'],
  ['src/features/coverage-simulator/CustomerPickerDialog.tsx', 'scroll inside ModalShell'],
  ['src/features/coverage-simulator/CoverageShareDialog.tsx', 'centered transparent dialog'],
  ['src/features/customers/CustomerListFilterModal.tsx', 'scroll inside ModalShell'],
  ['src/features/customers/CustomerRelationsPanel.tsx', 'scroll inside ModalShell'],
  ['src/features/design-system/DesignSystemGalleryScreen.tsx', 'DEV-only gallery'],
  ['src/features/coverage-simulator/CoveragePdfPreviewZoomSurface.tsx', 'pinch-zoom surface embedded in a viewer'],
  ['src/features/personal-binders/BinderZoomSurface.tsx', 'pinch-zoom surface embedded in a viewer'],
]);

function hasVerticalPageScroll(source: string): boolean {
  const re = /(?<![\w.])<(ScrollView|FlatList|SectionList)\b/g;
  let m;
  while ((m = re.exec(source))) {
    // Opening tag ends at the first `>` that is not part of `=>`.
    const rest = source.slice(m.index);
    const end = rest.search(/[^=]>/);
    const tag = rest.slice(0, end < 0 ? 400 : end + 2);
    if (!/\bhorizontal\b/.test(tag)) return true;
  }
  return false;
}

describe('page scroll bottom inset guard', () => {
  it('every vertical page scroll gets the nav-bar inset from the shared policy', () => {
    const offenders = walk(SRC)
      .filter((file) => file.endsWith('.tsx'))
      .map((file) => relative(ROOT, file).split('\\').join('/'))
      .filter((rel) => !SCROLL_ALLOWLIST.has(rel))
      .filter((rel) => {
        const source = readFileSync(join(ROOT, rel), 'utf8');
        return hasVerticalPageScroll(source) && !SAFE_CONTAINER.test(source);
      });
    expect(offenders).toEqual([]);
  });

  it('ScheduleScreen and DeviceContactsScreen wrap their list in <Screen>', () => {
    for (const rel of ['src/features/schedule/ScheduleScreen.tsx', 'src/features/device-contacts/DeviceContactsScreen.tsx']) {
      expect(readFileSync(join(ROOT, rel), 'utf8')).toMatch(/<Screen padded=\{false\}>/);
    }
  });
});
