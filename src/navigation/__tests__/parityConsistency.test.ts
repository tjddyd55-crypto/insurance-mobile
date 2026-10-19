import {
  USER_APP_MENU,
  listPrimaryMenuLabels,
  listSecondaryMenuLabels,
} from '../../navigation/menuConfig';

/**
 * Lightweight consistency check vs docs/feature-parity.md expectations.
 */
describe('feature parity source consistency', () => {
  it('menu SSOT has 8 primary sections for USER', () => {
    expect(USER_APP_MENU).toHaveLength(8);
    expect(listPrimaryMenuLabels()).toHaveLength(8);
  });

  it('every link has legacyWebPath and nativePath', () => {
    for (const section of USER_APP_MENU) {
      for (const child of section.children) {
        expect(child.legacyWebPath.length).toBeGreaterThan(0);
        expect(child.nativePath.startsWith('/')).toBe(true);
        expect(['NATIVE', 'WEBVIEW', 'WEBVIEW_TEMP', 'PC_ONLY', 'DISABLED']).toContain(child.mode);
      }
    }
  });

  it('secondary count is stable for M1 baseline', () => {
    expect(listSecondaryMenuLabels().length).toBeGreaterThanOrEqual(20);
  });

  it('opens only 모바일 명함 in a WebView (everything else stays native)', () => {
    const webviews = USER_APP_MENU.flatMap((section) => section.children).filter(
      (child) => child.mode === 'WEBVIEW' || child.mode === 'WEBVIEW_TEMP',
    );
    expect(webviews.map((child) => child.nativePath)).toEqual(['/profile/mobile-card']);
  });
});
