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

  it('keeps list cards on a fixed 3:4 frame with contain so flyers are not cropped', () => {
    const screen = readSource('NewslettersScreen.tsx');
    expect(screen).toMatch(/NEWSLETTER_IMAGE_ASPECT_RATIO/);
    expect(screen).toMatch(/newsletterImageFrame/);
    expect(screen).toMatch(
      /newsletterImageFrame:\s*\{[^}]*aspectRatio:\s*NEWSLETTER_IMAGE_ASPECT_RATIO/,
    );
    expect(screen).toMatch(/resizeMode="contain"/);
    expect(screen).not.toMatch(/resizeMode="cover"/);
    expect(screen).toMatch(/NewsletterDetailGalleryImage/);
    expect(screen).not.toMatch(/NewsletterIntrinsicImage/);
    expect(screen).not.toMatch(/detailGalleryFrame/);
    expect(screen).not.toMatch(/detailGalleryImage/);
  });

  it('sizes detail gallery from Image.getSize ratio without cropping', () => {
    const intrinsic = readSource('NewsletterIntrinsicImage.tsx');
    const gallery = readSource('NewsletterDetailGalleryImage.tsx');

    expect(gallery).toMatch(/NewsletterIntrinsicImage/);
    expect(gallery).toMatch(/NewsletterDetailImagePressable/);
    expect(gallery).not.toMatch(/NEWSLETTER_IMAGE_ASPECT_RATIO/);
    expect(gallery).not.toMatch(/resizeMode="cover"/);
    expect(gallery).not.toMatch(/absoluteFill/);
    expect(gallery).not.toMatch(/overflow:\s*['"]hidden['"]/);

    expect(intrinsic).toMatch(/Image\.getSize/);
    expect(intrinsic).toMatch(/resolveNewsletterDetailImageAspectRatio/);
    expect(intrinsic).toMatch(/resizeMode="contain"/);
    expect(intrinsic).toMatch(/minHeight:\s*220/);
    expect(intrinsic).not.toMatch(/onLoad=\{/);
    expect(intrinsic).not.toMatch(/NEWSLETTER_IMAGE_ASPECT_RATIO/);
    expect(intrinsic).not.toMatch(/resizeMode="cover"/);
    expect(intrinsic).not.toMatch(/absoluteFill/);
    expect(intrinsic).not.toMatch(/overflow:\s*['"]hidden['"]/);
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
    expect(viewer).not.toMatch(/resolveNewsletterDetailImageAspectRatio/);
  });
});
