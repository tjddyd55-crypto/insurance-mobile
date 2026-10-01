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
    expect(source).toMatch(/resizeMode="contain"/);
    expect(source).not.toMatch(/resizeMode="cover"/);
    expect(source).toMatch(/resolveNewsletterListCardImageUrl/);
    expect(source).not.toMatch(/NewsletterIntrinsicImage/);
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

  it('renders detail linkPreview as a rich card instead of a secondary button', () => {
    const source = readSource('NewslettersScreen.tsx');
    const card = readSource('NewsletterLinkPreviewCard.tsx');
    expect(source).toMatch(/NewsletterLinkPreviewCard/);
    expect(source).toMatch(/getNewsletterLinkPreview\(detail\.data\)/);
    expect(source).not.toMatch(/preview=\{detail\.data\.linkPreview\}/);
    expect(source).not.toMatch(/label=\{detail\.data\.linkPreview/);
    expect(source).not.toMatch(/관련 링크 열기/);
    expect(card).toMatch(/normalizeNewsletterLinkPreview/);
    expect(card).toMatch(/resolveNewsletterLinkPreviewCardModel/);
    expect(card).toMatch(/newsletter-link-preview-placeholder/);
    expect(card).toMatch(/newsletter-link-preview-domain/);
    expect(card).toMatch(/NEWSLETTER_LINK_PREVIEW_PLACEHOLDER_HEIGHT/);
    expect(card).toMatch(/theme\.spacing\.lg/);
    expect(card).toMatch(/Linking\.openURL/);
    expect(card).toMatch(/variant="outlined"/);
    expect(card).toMatch(/variant="cardTitle"/);
    expect(card).not.toMatch(/variant="secondary"/);
    expect(card).not.toMatch(/numberOfLines=\{1\}[\s\S]*variant="cardTitle"/);
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
