// @ts-nocheck
const fs = require('fs');
const path = require('path');

function readSource(fileName: string): string {
  return fs.readFileSync(path.join(__dirname, '..', fileName), 'utf8');
}

describe('newsletterImageCarousel', () => {
  it('sizes carousel pages to content width and uses dynamic image height', () => {
    const source = readSource('newsletterImageCarousel.tsx');
    expect(source).toMatch(/width: contentWidth/);
    expect(source).toMatch(/onLoad/);
    expect(source).not.toMatch(/aspectRatio:\s*9\s*\/\s*16/);
  });

  it('opens zoom only from visible image pressable', () => {
    const source = readSource('newsletterImageCarousel.tsx');
    expect(source).toMatch(/onImagePress/);
    expect(source).toMatch(/NewsletterCarouselImage/);
    expect(source).toMatch(/accessibilityLabel="이미지 확대"/);
  });
});
