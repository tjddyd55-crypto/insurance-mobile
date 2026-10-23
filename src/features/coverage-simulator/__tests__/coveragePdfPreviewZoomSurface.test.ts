// @ts-nocheck
const fs = require('fs');
const path = require('path');

describe('CoveragePdfPreviewZoomSurface', () => {
  it('uses pinch/pan gestures and resets on documentKey', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../CoveragePdfPreviewZoomSurface.tsx'),
      'utf8',
    );
    expect(src).toMatch(/Gesture\.Pinch/);
    expect(src).toMatch(/Gesture\.Pan/);
    expect(src).toMatch(/blocksExternalGesture\(scrollGesture\)/);
    expect(src).toMatch(/requireExternalGestureToFail\(pinch\)/);
    expect(src).toMatch(/numberOfTouches >= 2/);
    expect(src).toMatch(/setNativeProps\(\{ scrollEnabled: false \}\)/);
    expect(src).toMatch(/state\.activate\(\)/);
    expect(src).toMatch(/state\.fail\(\)/);
    expect(src).toMatch(/react-native-gesture-handler/);
    expect(src).toMatch(/manualActivation\(true\)/);
    expect(src).toMatch(/documentKey/);
    expect(src).toMatch(/NEWS_DETAIL_ZOOM_MAX/);
  });

  it('disables drawer swipe while the pdf preview is focused', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../CoveragePdfPreviewScreen.tsx'),
      'utf8',
    );
    expect(src).toMatch(/setDrawerSwipe\(navigation, false\)/);
    expect(src).toMatch(/setDrawerSwipe\(navigation, true\)/);
  });

  it('removes pdf save placeholder from preview screen', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../CoveragePdfPreviewScreen.tsx'),
      'utf8',
    );
    expect(src).not.toMatch(/아직 만들지 않습니다/);
    expect(src).toMatch(/shareNativeCoveragePdf/);
  });
});
