// @ts-nocheck
const fs = require('fs');
const path = require('path');

function readSource(fileName: string): string {
  return fs.readFileSync(path.join(__dirname, '..', fileName), 'utf8');
}

describe('newsletterImageLayout', () => {
  it('defines list thumbnail aspect ratio SSOT', () => {
    const source = readSource('newsletterImageLayout.ts');
    expect(source).toMatch(/NEWSLETTER_IMAGE_ASPECT_RATIO = 3 \/ 4/);
  });

  it('uses the same aspect ratio for list and detail images', () => {
    const screen = readSource('NewslettersScreen.tsx');
    expect(screen).toMatch(/NEWSLETTER_IMAGE_ASPECT_RATIO/);
    expect(screen).toMatch(/newsletterImageFrame/);
    expect(screen).toMatch(
      /detailGalleryImage:\s*\{[^}]*aspectRatio:\s*NEWSLETTER_IMAGE_ASPECT_RATIO/,
    );
    expect(screen).not.toMatch(/detailGalleryImage:\s*\{[^}]*minHeight/);
  });

  it('keeps zoom viewer separate from list aspect ratio', () => {
    const viewer = fs.readFileSync(
      path.join(__dirname, '..', '..', '..', 'components', 'NewsDetailImageViewerModal.tsx'),
      'utf8',
    );
    expect(viewer).not.toMatch(/NEWSLETTER_IMAGE_ASPECT_RATIO/);
  });
});
