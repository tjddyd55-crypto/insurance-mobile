// @ts-nocheck
const {
  NEWS_DETAIL_IMAGE_MIN_SCALE,
  NEWS_DETAIL_IMAGE_MAX_SCALE,
  clampNewsDetailImageScale,
} = require('../newsDetailImageZoomGestures');

describe('newsDetailImageZoomGestures', () => {
  it('defines shared min and max scale bounds', () => {
    expect(NEWS_DETAIL_IMAGE_MIN_SCALE).toBe(1);
    expect(NEWS_DETAIL_IMAGE_MAX_SCALE).toBe(3);
  });

  it('clamps scale to min bound', () => {
    expect(clampNewsDetailImageScale(0.5)).toBe(1);
    expect(clampNewsDetailImageScale(1)).toBe(1);
  });

  it('clamps scale to max bound', () => {
    expect(clampNewsDetailImageScale(4)).toBe(3);
    expect(clampNewsDetailImageScale(3)).toBe(3);
  });

  it('keeps values within range unchanged', () => {
    expect(clampNewsDetailImageScale(2)).toBe(2);
    expect(clampNewsDetailImageScale(1.5)).toBe(1.5);
  });
});
