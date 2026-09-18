// @ts-nocheck
const fs = require('fs');
const path = require('path');

function readSource(fileName: string): string {
  return fs.readFileSync(path.join(__dirname, '..', fileName), 'utf8');
}

describe('newslettersContracts', () => {
  it('does not render title in list or detail layouts', () => {
    const source = readSource('NewslettersScreen.tsx');
    expect(source).not.toMatch(/item\.title/);
    expect(source).not.toMatch(/variant="title"/);
    expect(source).toMatch(/resolveNewsletterPublisherName/);
    expect(source).toMatch(/newsletterListPreviewText/);
  });

  it('uses publisher metadata row in list cards', () => {
    const source = readSource('NewslettersScreen.tsx');
    expect(source).toMatch(/formatPublishedAt\(item\.publishedAt\)/);
    expect(source).not.toMatch(/authorDisplayName/);
    expect(source).not.toMatch(/authorName/);
  });

  it('uses secondary close button and safe area in detail modal', () => {
    const source = readSource('NewslettersScreen.tsx');
    expect(source).toMatch(/variant="secondary"/);
    expect(source).toMatch(/useSafeAreaInsets/);
    expect(source).toMatch(/useBottomSafeInset/);
    expect(source).toMatch(/CustomerNewsImageCarousel/);
  });
});
