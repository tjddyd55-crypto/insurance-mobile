// @ts-nocheck
const fs = require('fs');
const path = require('path');

import { resolveNewsletterDetailImageAspectRatio } from '../newsletterImageLayout';

function readSource(fileName: string): string {
  return fs.readFileSync(path.join(__dirname, '..', fileName), 'utf8');
}

describe('newsletterImageLayout', () => {
  it('defines list thumbnail aspect ratio SSOT', () => {
    const source = readSource('newsletterImageLayout.ts');
    expect(source).toMatch(/NEWSLETTER_IMAGE_ASPECT_RATIO = 3 \/ 4/);
    expect(source).toMatch(/export function resolveNewsletterDetailImageAspectRatio/);
  });

  it('uses 3:4 cover thumbnails only for list cards', () => {
    const screen = readSource('NewslettersScreen.tsx');
    expect(screen).toMatch(/NEWSLETTER_IMAGE_ASPECT_RATIO/);
    expect(screen).toMatch(/newsletterImageFrame/);
    expect(screen).toMatch(
      /newsletterImageFrame:\s*\{[^}]*aspectRatio:\s*NEWSLETTER_IMAGE_ASPECT_RATIO/,
    );
    expect(screen).toMatch(/resizeMode="cover"/);
    expect(screen).toMatch(/NewsletterDetailGalleryImage/);
    expect(screen).not.toMatch(/detailGalleryFrame/);
    expect(screen).not.toMatch(/detailGalleryImage/);
  });

  it('sizes detail gallery from intrinsic onLoad ratio without cropping', () => {
    const gallery = readSource('NewsletterDetailGalleryImage.tsx');
    expect(gallery).toMatch(/onLoad/);
    expect(gallery).toMatch(/resolveNewsletterDetailImageAspectRatio/);
    expect(gallery).toMatch(/NewsletterDetailImagePressable/);
    expect(gallery).toMatch(/resizeMode="contain"/);
    expect(gallery).toMatch(/nativeEvent\.source\.width/);
    expect(gallery).toMatch(/nativeEvent\.source\.height/);
    expect(gallery).not.toMatch(/NEWSLETTER_IMAGE_ASPECT_RATIO/);
    expect(gallery).not.toMatch(/resizeMode="cover"/);
    expect(gallery).not.toMatch(/absoluteFill/);
  });

  it('resolves intrinsic detail aspect from image dimensions', () => {
    expect(resolveNewsletterDetailImageAspectRatio(900, 1200)).toBe(0.75);
    expect(resolveNewsletterDetailImageAspectRatio(800, 2400)).toBeCloseTo(1 / 3);
    expect(resolveNewsletterDetailImageAspectRatio(1080, 1920)).toBeCloseTo(1080 / 1920);
    expect(resolveNewsletterDetailImageAspectRatio(0, 100)).toBeNull();
    expect(resolveNewsletterDetailImageAspectRatio(100, 0)).toBeNull();
    expect(resolveNewsletterDetailImageAspectRatio(-1, 10)).toBeNull();
    expect(resolveNewsletterDetailImageAspectRatio(Number.NaN, 10)).toBeNull();
    expect(resolveNewsletterDetailImageAspectRatio(10, Number.POSITIVE_INFINITY)).toBeNull();
  });

  it('keeps zoom viewer separate from list aspect ratio', () => {
    const viewer = fs.readFileSync(
      path.join(__dirname, '..', '..', '..', 'components', 'NewsDetailImageViewerModal.tsx'),
      'utf8',
    );
    expect(viewer).not.toMatch(/NEWSLETTER_IMAGE_ASPECT_RATIO/);
  });
});
