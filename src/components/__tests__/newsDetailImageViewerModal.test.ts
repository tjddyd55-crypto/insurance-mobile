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
    expect(source).toMatch(/GestureDetector/);
    expect(source).toMatch(/useNewsDetailImageZoomGestures/);
  });

  it('resets transform when image url changes via shared hook resetKey', () => {
    const source = readSource('NewsDetailImageViewerModal.tsx');
    expect(source).toMatch(/resetKey: visible && uri \? uri : null/);
  });
});
