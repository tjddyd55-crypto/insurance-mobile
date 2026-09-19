// @ts-nocheck
const fs = require('fs');
const path = require('path');

function readSource(fileName: string): string {
  return fs.readFileSync(path.join(__dirname, '..', fileName), 'utf8');
}

describe('NewsletterDetailPageZoomContent', () => {
  it('keeps pinch and horizontal pan separate from vertical scroll ownership', () => {
    const source = readSource('useNewsletterDetailPageZoom.ts');
    expect(source).toMatch(/Gesture\.Pinch/);
    expect(source).toMatch(/Gesture\.Pan/);
    expect(source).toMatch(/Gesture\.Race\(pinchGesture, horizontalPanGesture\)/);
    expect(source).toMatch(/simultaneousWithExternalGesture\(scrollGesture\)/);
    expect(source).toMatch(/activeOffsetX\(\[-10, 10\]\)/);
    expect(source).toMatch(/failOffsetY\(\[-10, 10\]\)/);
    expect(source).not.toMatch(/Gesture\.Tap/);
    expect(source).not.toMatch(/Gesture\.Simultaneous/);
    expect(source).not.toMatch(/manualActivation/);
    expect(source).not.toMatch(/scrollEnabled/);
  });

  it('keeps the RN ScrollView and models it as an external native gesture', () => {
    const screen = readSource('NewslettersScreen.tsx');
    expect(screen).toMatch(
      /<Modal[\s\S]*<GestureHandlerRootView style=\{styles\.gestureRoot\}>/,
    );
    expect(screen).toMatch(/Gesture\.Native\(\)/);
    expect(screen).toMatch(
      /<GestureDetector gesture=\{detailPageGesture\}>[\s\S]*<GestureDetector gesture=\{detailScrollGesture\}>/,
    );
    expect(screen).toMatch(
      /<GestureDetector gesture=\{detailScrollGesture\}>[\s\S]*<Animated\.ScrollView/,
    );
    expect(screen).not.toMatch(/ScrollView.*from 'react-native-gesture-handler'/);
  });

  it('uses focal translation and direct height compensation without a spacer', () => {
    const source = readSource('NewsletterDetailPageZoomContent.tsx');
    expect(source).toMatch(/calculateNewsletterDetailPageZoomLayout/);
    expect(source).toMatch(/width: layout\.logicalWidth/);
    expect(source).toMatch(/marginBottom: layout\.marginBottom/);
    expect(source).toMatch(/transformOrigin: \[0, 0, 0\]/);
    expect(source).toMatch(/translateX: translateX\.value/);
    expect(source).not.toMatch(/spacer/);
    expect(source).not.toMatch(/scrollTo/);
  });

  it('resets zoom when the selected newsletter changes', () => {
    const source = readSource('useNewsletterDetailPageZoom.ts');
    expect(source).toMatch(/\[resetKey\]/);
    expect(source).toMatch(/scale\.value = NEWS_DETAIL_ZOOM_MIN/);
    expect(source).toMatch(/translateX\.value = 0/);
  });

  it('keeps the pinch focal point with UI-thread scroll and horizontal translation', () => {
    const source = readSource('useNewsletterDetailPageZoom.ts');
    expect(source).toMatch(/event\.focalX/);
    expect(source).toMatch(/event\.focalY/);
    expect(source).toMatch(/scrollTo\(scrollRef/);
    expect(source).toMatch(/useAnimatedScrollHandler/);
  });

  it('keeps the modal header outside the zoom wrapper', () => {
    const screen = readSource('NewslettersScreen.tsx');
    const headerIndex = screen.indexOf('<View style={styles.modalHeader}>');
    const zoomIndex = screen.indexOf('<NewsletterDetailPageZoomContent');
    expect(headerIndex).toBeGreaterThan(-1);
    expect(zoomIndex).toBeGreaterThan(headerIndex);
  });
});
