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
    expect(src).toMatch(/documentKey/);
    expect(src).toMatch(/NEWS_DETAIL_ZOOM_MAX/);
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
