// @ts-nocheck
const {
  NEWS_DETAIL_ZOOM_MIN,
  NEWS_DETAIL_ZOOM_MAX,
  clampNewsDetailZoomScale,
  calculateContainRenderedSize,
  calculatePanBounds,
  clampTranslation,
  binderPageOriginInViewport,
  focalPointToPageLocal,
  translationForFocalPinch,
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

  it.each([
    [0, 400, 2, 400, 800],
    [300, 0, 2, 400, 800],
    [300, 400, Number.NaN, 400, 800],
    [300, 400, 2, 0, 800],
    [300, 400, 2, 400, Number.POSITIVE_INFINITY],
  ])(
    'returns zero pan bounds for invalid geometry',
    (renderedWidth, renderedHeight, scale, viewportWidth, viewportHeight) => {
      expect(
        calculatePanBounds(
          renderedWidth,
          renderedHeight,
          scale,
          viewportWidth,
          viewportHeight,
        ),
      ).toEqual({ maxX: 0, maxY: 0 });
    },
  );

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

  it('normalizes invalid translation and bounds', () => {
    expect(
      clampTranslation(Number.NaN, Number.POSITIVE_INFINITY, {
        maxX: Number.NaN,
        maxY: -10,
      }),
    ).toEqual({ x: 0, y: 0 });
  });

  it('keeps the focal point stable while pinch scale changes', () => {
    const pageWidth = 300;
    const pageHeight = 400;
    const origin = binderPageOriginInViewport(360, pageWidth, 40, 0);
    const focalX = 180;
    const focalY = 220;
    const startScale = 1;
    const focalPage = focalPointToPageLocal(
      focalX,
      focalY,
      origin,
      pageWidth,
      pageHeight,
      startScale,
      0,
      0,
    );
    const nextScale = 2;
    const nextTranslation = translationForFocalPinch(
      focalX,
      focalY,
      focalPage,
      origin,
      pageWidth,
      pageHeight,
      nextScale,
    );
    const roundTrip = focalPointToPageLocal(
      focalX,
      focalY,
      origin,
      pageWidth,
      pageHeight,
      nextScale,
      nextTranslation.x,
      nextTranslation.y,
    );
    expect(roundTrip.x).toBeCloseTo(focalPage.x, 4);
    expect(roundTrip.y).toBeCloseTo(focalPage.y, 4);
  });
});
