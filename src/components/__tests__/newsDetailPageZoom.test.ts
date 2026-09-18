// @ts-nocheck
const fs = require('fs');
const path = require('path');

function readSource(fileName: string): string {
  return fs.readFileSync(path.join(__dirname, '..', fileName), 'utf8');
}

describe('newsDetailPageZoom', () => {
  it('applies pinch-only page zoom to shared content wrapper', () => {
    const hook = readSource('useNewsDetailPagePinchZoom.ts');
    expect(hook).toMatch(/Gesture\.Pinch/);
    expect(hook).not.toMatch(/Gesture\.Pan/);
    expect(hook).not.toMatch(/Gesture\.Tap/);
    expect(hook).toMatch(/clampNewsDetailZoomScale/);
    expect(hook).toMatch(/\[resetKey\]/);
    expect(hook).toMatch(/getScaledContentHeight/);
    expect(hook).toMatch(/getPageZoomTopOriginTranslateY/);
    expect(hook).toMatch(/calculatePageZoomMaxScrollY/);
    expect(hook).toMatch(/clampPageZoomScrollY/);
  });

  it('aligns scroll spacer height with scaled content', () => {
    const content = readSource('NewsDetailPageZoomContent.tsx');
    expect(content).toMatch(/spacerStyle/);
    expect(content).toMatch(/onLayout=\{handleContentLayout\}/);
    expect(content).toMatch(/setBaseHeight/);
  });

  it('wraps body images and attachments in one zoom container', () => {
    const screen = fs.readFileSync(
      path.join(__dirname, '..', '..', 'features', 'newsletters', 'NewslettersScreen.tsx'),
      'utf8',
    );
    expect(screen).toMatch(/NewsDetailPageZoomContent/);
    expect(screen).toMatch(/resetKey=\{item\?\.id/);
    expect(screen).not.toMatch(/NewsletterDetailInlineZoomImage/);
    expect(screen).not.toMatch(/detailScrollEnabled/);
    expect(screen).not.toMatch(/inlineZoomActiveUrlsRef/);
    expect(screen).toMatch(/setZoomImageUrl\(url\)/);
    expect(screen).toMatch(/detailScrollRef/);
    expect(screen).toMatch(/detailScrollYRef/);
    expect(screen).toMatch(/viewportHeight=\{detailViewportHeight\}/);
    expect(screen).toMatch(/bottomPadding=\{detailScrollBottomPadding\}/);
  });

  it('keeps header outside zoomable content', () => {
    const screen = fs.readFileSync(
      path.join(__dirname, '..', '..', 'features', 'newsletters', 'NewslettersScreen.tsx'),
      'utf8',
    );
    const modalStart = screen.indexOf('function NewsletterDetailModal');
    const modalSource = screen.slice(modalStart);
    const headerIndex = modalSource.indexOf('styles.modalHeader');
    const zoomIndex = modalSource.indexOf('<NewsDetailPageZoomContent');
    expect(headerIndex).toBeGreaterThan(-1);
    expect(zoomIndex).toBeGreaterThan(headerIndex);
    expect(modalSource).toMatch(/<\/View>\s*<GestureHandlerRootView/);
  });
});
