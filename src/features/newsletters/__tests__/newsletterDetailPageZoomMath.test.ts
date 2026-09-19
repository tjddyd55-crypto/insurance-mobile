import { calculateNewsletterDetailPageZoomLayout } from '../newsletterDetailPageZoomMath';

describe('newsletterDetailPageZoomMath', () => {
  it('keeps the baseline layout unchanged at scale 1', () => {
    expect(calculateNewsletterDetailPageZoomLayout(360, 900, 1)).toEqual({
      logicalWidth: 360,
      marginBottom: 0,
    });
  });

  it('keeps content width and exposes transformed height at scale 2', () => {
    expect(calculateNewsletterDetailPageZoomLayout(360, 900, 2)).toEqual({
      logicalWidth: 360,
      marginBottom: 900,
    });
  });

  it('supports the maximum page scale', () => {
    expect(calculateNewsletterDetailPageZoomLayout(360, 1200, 3)).toEqual({
      logicalWidth: 360,
      marginBottom: 2400,
    });
  });

  it('falls back safely for invalid layout input', () => {
    expect(
      calculateNewsletterDetailPageZoomLayout(
        Number.NaN,
        Number.POSITIVE_INFINITY,
        Number.NaN,
      ),
    ).toEqual({
      logicalWidth: 0,
      marginBottom: 0,
    });
  });
});
