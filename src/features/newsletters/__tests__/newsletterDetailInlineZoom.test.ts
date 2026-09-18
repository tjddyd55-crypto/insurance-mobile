// @ts-nocheck
const fs = require('fs');
const path = require('path');

function readSource(fileName: string): string {
  return fs.readFileSync(path.join(__dirname, '..', fileName), 'utf8');
}

describe('newsletterDetailInlineZoom', () => {
  it('renders inline zoom wrapper with initial transform-only image', () => {
    const source = readSource('NewsletterDetailInlineZoomImage.tsx');
    expect(source).toMatch(/GestureDetector/);
    expect(source).toMatch(/Animated\.Image/);
    expect(source).toMatch(/absoluteFill/);
    expect(source).toMatch(/useNewsDetailImageZoomGestures/);
    expect(source).toMatch(/onTap: onPress/);
  });

  it('wires detail gallery to inline zoom without replacing fullscreen viewer', () => {
    const screen = readSource('NewslettersScreen.tsx');
    expect(screen).toMatch(/NewsletterDetailInlineZoomImage/);
    expect(screen).toMatch(/NewsDetailImageViewerModal/);
    expect(screen).toMatch(/onPress=\{\(\) => setZoomImageUrl\(url\)\}/);
    expect(screen).toMatch(/scrollEnabled=\{detailScrollEnabled\}/);
    expect(screen).toMatch(/from 'react-native-gesture-handler'/);
    expect(screen).toMatch(/GestureHandlerRootView/);
  });

  it('isolates multi-image zoom state and resets on detail change', () => {
    const screen = readSource('NewslettersScreen.tsx');
    expect(screen).toMatch(/handleInlineZoomActiveChange/);
    expect(screen).toMatch(/inlineZoomActiveUrlsRef/);
    expect(screen).toMatch(/resetKey=\{item\?\.id/);
    expect(screen).toMatch(/\[item\?\.id\]/);
  });

  it('keeps detail 3:4 frame and text-first segment order', () => {
    const screen = readSource('NewslettersScreen.tsx');
    expect(screen).toMatch(/frameStyle=\{styles\.detailGalleryFrame\}/);
    expect(screen).toMatch(/newsletterDetailSegmentOrder/);
    expect(screen).toMatch(/segment === 'body'/);
    expect(screen).toMatch(/segment === 'gallery'/);
  });
});
