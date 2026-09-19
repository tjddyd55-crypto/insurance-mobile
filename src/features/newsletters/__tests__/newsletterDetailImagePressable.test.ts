import {
  NEWSLETTER_IMAGE_TAP_MAX_MOVEMENT,
  isNewsletterImageTapMovement,
} from '../NewsletterDetailImagePressable';

describe('NewsletterDetailImagePressable', () => {
  const start = { pageX: 100, pageY: 200 };

  it('accepts a stationary touch as a tap', () => {
    expect(isNewsletterImageTapMovement(start, start)).toBe(true);
  });

  it('accepts movement at the tap threshold', () => {
    expect(
      isNewsletterImageTapMovement(start, {
        pageX: start.pageX + NEWSLETTER_IMAGE_TAP_MAX_MOVEMENT,
        pageY: start.pageY,
      }),
    ).toBe(true);
  });

  it('rejects drag movement beyond the tap threshold', () => {
    expect(
      isNewsletterImageTapMovement(start, {
        pageX: start.pageX,
        pageY: start.pageY + NEWSLETTER_IMAGE_TAP_MAX_MOVEMENT + 1,
      }),
    ).toBe(false);
  });

  it('uses radial distance instead of a single axis threshold', () => {
    expect(
      isNewsletterImageTapMovement(start, {
        pageX: start.pageX + 8,
        pageY: start.pageY + 8,
      }),
    ).toBe(false);
  });
});
