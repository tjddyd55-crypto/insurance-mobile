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
    expect(source).toMatch(/resolveNewsletterAuthorLabel/);
    expect(source).toMatch(/newsletterListPreviewText/);
  });

  it('uses Web SSOT author and date fields in list cards', () => {
    const source = readSource('NewslettersScreen.tsx');
    expect(source).toMatch(/formatInsurerNewsDateLabel\(item\.publishedAt\)/);
    expect(source).toMatch(/utils\/insurerNewsPresentation/);
    expect(source).toMatch(/utils\/formatInsurerNewsDate/);
  });

  it('uses shared close button, image zoom viewer, and safe area in detail modal', () => {
    const source = readSource('NewslettersScreen.tsx');
    expect(source).toMatch(/ModalCloseButton/);
    expect(source).toMatch(/NewsDetailImageViewerModal/);
    expect(source).toMatch(/onImagePress/);
    expect(source).toMatch(/useSafeAreaInsets/);
    expect(source).toMatch(/useBottomSafeInset/);
    expect(source).toMatch(/CustomerNewsImageCarousel/);
  });
});
