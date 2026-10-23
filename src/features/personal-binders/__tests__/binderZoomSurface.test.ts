// @ts-nocheck
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(
  path.join(__dirname, '../BinderZoomSurface.tsx'),
  'utf8',
);

describe('BinderZoomSurface zoom layout', () => {
  it('keeps scroll content padding stable while zooming', () => {
    expect(source).toMatch(/paddingVertical: verticalPadding/);
    expect(source).not.toMatch(/scrollEnabled \? height : undefined/);
    expect(source).not.toMatch(/scrollEnabled && !pageTallerThanViewport/);
  });

  it('uses focal-point pinch math and scroll offset compensation', () => {
    expect(source).toMatch(/translationForFocalPinch/);
    expect(source).toMatch(/focalPointToPageLocal/);
    expect(source).toMatch(/translateY\.value \+= scrollComp/);
    expect(source).toMatch(/disableScrollForPinch/);
  });
});
