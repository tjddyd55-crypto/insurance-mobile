// @ts-nocheck
const fs = require('fs');
const path = require('path');

function readSource(fileName: string): string {
  return fs.readFileSync(path.join(__dirname, '..', fileName), 'utf8');
}

describe('useNewsDetailImageZoomGestures', () => {
  it('composes pinch, pan, and tap gestures', () => {
    const source = readSource('useNewsDetailImageZoomGestures.ts');
    expect(source).toMatch(/Gesture\.Pinch/);
    expect(source).toMatch(/Gesture\.Pan/);
    expect(source).toMatch(/Gesture\.Tap/);
    expect(source).toMatch(/Gesture\.Simultaneous/);
  });

  it('disables pan when scale is at minimum', () => {
    const source = readSource('useNewsDetailImageZoomGestures.ts');
    expect(source).toMatch(/manualActivation\(true\)/);
    expect(source).toMatch(/scale\.value > NEWS_DETAIL_IMAGE_MIN_SCALE/);
    expect(source).toMatch(/state\.fail\(\)/);
  });

  it('resets translate when scale returns to minimum', () => {
    const source = readSource('useNewsDetailImageZoomGestures.ts');
    expect(source).toMatch(/scale\.value <= NEWS_DETAIL_IMAGE_MIN_SCALE/);
    expect(source).toMatch(/translateX\.value = withTiming\(0\)/);
    expect(source).toMatch(/translateY\.value = withTiming\(0\)/);
  });

  it('ignores tap while pinch session is active', () => {
    const source = readSource('useNewsDetailImageZoomGestures.ts');
    expect(source).toMatch(/pinchSession\.value === 0/);
    expect(source).toMatch(/scale\.value <= NEWS_DETAIL_IMAGE_MIN_SCALE \+ 0\.01/);
  });

  it('resets transform when resetKey changes', () => {
    const source = readSource('useNewsDetailImageZoomGestures.ts');
    expect(source).toMatch(/resetTransform/);
    expect(source).toMatch(/\[resetKey\]/);
  });
});
