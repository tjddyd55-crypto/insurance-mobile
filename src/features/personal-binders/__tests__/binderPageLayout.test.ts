import { edgeToEdgePageSize, imageAspectFromLoadEvent } from '../binderPageLayout';

describe('binder page layout', () => {
  it('uses the full viewport width and the image aspect', () => {
    expect(edgeToEdgePageSize(390, 1080 / 1528)).toEqual({ width: 390, height: 390 / (1080 / 1528) });
  });

  it('reads page aspect from native or web image load events', () => {
    expect(imageAspectFromLoadEvent({ nativeEvent: { source: { width: 1080, height: 1528 } } })).toBeCloseTo(1080 / 1528);
    expect(imageAspectFromLoadEvent({ target: { naturalWidth: 240, naturalHeight: 340 } })).toBeCloseTo(240 / 340);
    expect(imageAspectFromLoadEvent({ nativeEvent: { source: undefined } })).toBeNull();
  });
});
