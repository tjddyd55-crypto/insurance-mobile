// @ts-nocheck
const fs = require('fs');
const path = require('path');

function readSource(fileName: string): string {
  return fs.readFileSync(path.join(__dirname, '..', fileName), 'utf8');
}

describe('NewsDetailImageViewerModal', () => {
  it('wraps modal content with GestureHandlerRootView for pinch gestures', () => {
    const source = readSource('NewsDetailImageViewerModal.tsx');
    expect(source).toMatch(/GestureHandlerRootView/);
    expect(source).toMatch(/Gesture\.Pinch/);
    expect(source).toMatch(/Gesture\.Pan/);
    expect(source).toMatch(/Gesture\.Simultaneous/);
  });

  it('resets transform when image url changes', () => {
    const source = readSource('NewsDetailImageViewerModal.tsx');
    expect(source).toMatch(/resetTransform/);
    expect(source).toMatch(/\[imageUrl\]/);
  });

  it('clamps pan using contain rendered size and viewport bounds', () => {
    const source = readSource('NewsDetailImageViewerModal.tsx');
    expect(source).toMatch(/calculateContainRenderedSize/);
    expect(source).toMatch(/calculatePanBounds/);
    expect(source).toMatch(/clampTranslation/);
    expect(source).toMatch(/Image\.getSize/);
    expect(source).toMatch(/resizeMode="contain"/);
  });
});
