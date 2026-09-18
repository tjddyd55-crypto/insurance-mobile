// @ts-nocheck
const {
  NEWS_DETAIL_ZOOM_MIN,
  NEWS_DETAIL_ZOOM_MAX,
  clampNewsDetailZoomScale,
  calculateContainRenderedSize,
  calculatePageZoomMaxScrollY,
  calculatePanBounds,
  clampPageZoomScrollY,
  clampTranslation,
  getPageZoomTopOriginTranslateY,
  getScaledContentHeight,
} = require('../newsDetailZoomMath');

describe('newsDetailZoomMath', () => {
  it('defines page and viewer zoom bounds', () => {
    expect(NEWS_DETAIL_ZOOM_MIN).toBe(1);
    expect(NEWS_DETAIL_ZOOM_MAX).toBe(3);
  });

  it('clamps zoom scale', () => {
    expect(clampNewsDetailZoomScale(0.5)).toBe(1);
    expect(clampNewsDetailZoomScale(2)).toBe(2);
    expect(clampNewsDetailZoomScale(4)).toBe(3);
  });

  it('calculates portrait contain rendered size', () => {
    const rendered = calculateContainRenderedSize(400, 800, 900, 1200);
    expect(rendered.width).toBe(400);
    expect(rendered.height).toBeCloseTo(533.33, 1);
  });

  it('calculates landscape contain rendered size', () => {
    const rendered = calculateContainRenderedSize(400, 800, 1600, 900);
    expect(rendered.width).toBe(400);
    expect(rendered.height).toBeCloseTo(225, 1);
  });

  it('calculates square contain rendered size', () => {
    const rendered = calculateContainRenderedSize(400, 800, 1000, 1000);
    expect(rendered.width).toBe(400);
    expect(rendered.height).toBe(400);
  });

  it('returns zero pan bounds at scale 1', () => {
    const bounds = calculatePanBounds(300, 400, 1, 400, 800);
    expect(bounds.maxX).toBe(0);
    expect(bounds.maxY).toBe(0);
  });

  it('calculates max X and Y pan bounds when zoomed', () => {
    const bounds = calculatePanBounds(300, 400, 2, 400, 800);
    expect(bounds.maxX).toBe(100);
    expect(bounds.maxY).toBe(0);
  });

  it('reclamps translation when scale decreases', () => {
    const bounds = calculatePanBounds(300, 400, 1.5, 400, 800);
    const clamped = clampTranslation(200, 50, bounds);
    expect(clamped.x).toBe(bounds.maxX);
    expect(clamped.y).toBe(0);
  });

  it('resets translation to center at scale 1', () => {
    const clamped = clampTranslation(120, 80, { maxX: 0, maxY: 0 });
    expect(clamped.x).toBe(0);
    expect(clamped.y).toBe(0);
  });

  it('calculates scaled content height from base height and scale', () => {
    expect(getScaledContentHeight(1000, 1)).toBe(1000);
    expect(getScaledContentHeight(1000, 2)).toBe(2000);
    expect(getScaledContentHeight(1000, 3)).toBe(3000);
  });

  it('anchors page zoom from the top edge', () => {
    expect(getPageZoomTopOriginTranslateY(1000, 1)).toBe(0);
    expect(getPageZoomTopOriginTranslateY(1000, 2)).toBe(500);
    expect(getPageZoomTopOriginTranslateY(1000, 3)).toBe(1000);
  });

  it('calculates page zoom max scroll for scale 1', () => {
    const maxScrollY = calculatePageZoomMaxScrollY({
      scaledContentHeight: 1200,
      viewportHeight: 700,
      topPadding: 16,
      bottomPadding: 24,
    });
    expect(maxScrollY).toBe(540);
  });

  it('calculates larger max scroll when content is zoomed', () => {
    const maxScrollY = calculatePageZoomMaxScrollY({
      scaledContentHeight: 2400,
      viewportHeight: 700,
      topPadding: 16,
      bottomPadding: 24,
    });
    expect(maxScrollY).toBe(1740);
  });

  it('clamps page zoom scroll offset to top and bottom', () => {
    expect(clampPageZoomScrollY(-10, 500)).toBe(0);
    expect(clampPageZoomScrollY(700, 500)).toBe(500);
    expect(clampPageZoomScrollY(250, 500)).toBe(250);
  });

  it('reclamps scroll offset when scale decreases', () => {
    const maxAtScale2 = calculatePageZoomMaxScrollY({
      scaledContentHeight: 2000,
      viewportHeight: 700,
      topPadding: 0,
      bottomPadding: 0,
    });
    const maxAtScale1 = calculatePageZoomMaxScrollY({
      scaledContentHeight: 1000,
      viewportHeight: 700,
      topPadding: 0,
      bottomPadding: 0,
    });
    expect(clampPageZoomScrollY(1500, maxAtScale2)).toBe(maxAtScale2);
    expect(clampPageZoomScrollY(1500, maxAtScale1)).toBe(maxAtScale1);
  });
});
