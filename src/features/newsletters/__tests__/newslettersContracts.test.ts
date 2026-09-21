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

  it('restores original two-column grid list layout', () => {
    const source = readSource('NewslettersScreen.tsx');
    expect(source).toMatch(/GRID_COLUMNS = 2/);
    expect(source).toMatch(/numColumns=\{GRID_COLUMNS\}/);
    expect(source).toMatch(/columnWrapperStyle=\{styles\.gridRow\}/);
    expect(source).toMatch(/NewsletterGridCard/);
    expect(source).toMatch(/NEWSLETTER_IMAGE_ASPECT_RATIO/);
    expect(source).toMatch(/newsletterImageFrame/);
    expect(source).toMatch(/resolveNewsletterListCardImageUrl/);
  });

  it('uses text-first stacked detail images with tap-to-fullscreen zoom viewer', () => {
    const source = readSource('NewslettersScreen.tsx');
    expect(source).toMatch(/newsletterDetailSegmentOrder/);
    expect(source).toMatch(/segment === 'body'/);
    expect(source).toMatch(/segment === 'gallery'/);
    expect(source).toMatch(/ModalCloseButton/);
    expect(source).toMatch(/NewsDetailImageViewerModal/);
    expect(source).toMatch(/NewsletterDetailGalleryImage/);
    expect(source).toMatch(/NewsletterDetailPageZoomContent/);
    expect(source).toMatch(/setZoomImageUrl\(url\)/);
    expect(readSource('NewsletterDetailGalleryImage.tsx')).toMatch(
      /NewsletterDetailImagePressable/,
    );
    expect(source).not.toMatch(/NewsletterDetailInlineZoomImage/);
    expect(source).not.toMatch(/NewsDetailPageZoomContent/);
    expect(source).not.toMatch(/detailScrollEnabled/);
    expect(source).not.toMatch(/inlineZoomActiveUrlsRef/);
    expect(source).toMatch(/GestureHandlerRootView/);
    expect(source).not.toMatch(/getScaledContentHeight/);
    expect(source).not.toMatch(/scrollEnabled=/);
    expect(source).not.toMatch(/NewsletterImageCarousel/);
    expect(source).not.toMatch(/CustomerNewsImageCarousel/);
    expect(source).toMatch(/useSafeAreaInsets/);
    expect(source).toMatch(/useBottomSafeInset/);
  });

  it('keeps customer-news carousel free of newsletter zoom hooks', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', '..', 'customer-news', 'customerNewsImageCarousel.tsx'),
      'utf8',
    );
    expect(source).not.toMatch(/onImagePress/);
    expect(source).not.toMatch(/이미지 확대/);
  });
});
