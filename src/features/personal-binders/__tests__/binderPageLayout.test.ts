import { computeBinderInitialScale, edgeToEdgePageSize, imageAspectFromLoadEvent } from '../binderPageLayout';

describe('binder page layout', () => {
  it('uses the full viewport width and the image aspect', () => {
    expect(edgeToEdgePageSize(390, 1080 / 1528)).toEqual({ width: 390, height: 390 / (1080 / 1528) });
  });

  it('computes fit-page initial scale for tall pages in short viewports', () => {
    const page = edgeToEdgePageSize(390);
    const scale = computeBinderInitialScale(390, 500, page.width, page.height);
    expect(scale).toBeLessThan(1);
    expect(scale).toBeGreaterThan(0.2);
  });

  it('reads page aspect from native or web image load events', () => {
    expect(imageAspectFromLoadEvent({ nativeEvent: { source: { width: 1080, height: 1528 } } })).toBeCloseTo(1080 / 1528);
    expect(imageAspectFromLoadEvent({ target: { naturalWidth: 240, naturalHeight: 340 } })).toBeCloseTo(240 / 340);
    expect(imageAspectFromLoadEvent({ nativeEvent: { source: undefined } })).toBeNull();
  });
});
