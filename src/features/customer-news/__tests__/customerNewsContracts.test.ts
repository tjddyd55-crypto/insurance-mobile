// @ts-nocheck
const fs = require('fs');
const path = require('path');

function readSource(fileName: string): string {
  return fs.readFileSync(path.join(__dirname, '..', fileName), 'utf8');
}

describe('customerNewsContracts', () => {
  it('does not render a title input in the customer news form', () => {
    const source = readSource('CustomerNewsScreen.tsx');
    expect(source).not.toMatch(/label="제목"/);
    expect(source).not.toMatch(/placeholder="제목"/);
    expect(source).not.toMatch(/form\.title/);
    expect(source).not.toMatch(/value\.title/);
  });

  it('does not render a title area in preview or detail layouts', () => {
    const previewSource = readSource('CustomerNewsPreviewModal.tsx');
    const screenSource = readSource('CustomerNewsScreen.tsx');
    expect(previewSource).not.toMatch(/draft\.title/);
    expect(previewSource).not.toMatch(/item\.title/);
    expect(screenSource).not.toMatch(/listCardPreviewText\(item\).*item\.title/);
  });

  it('keeps preview modal free of publish mutations', () => {
    const previewSource = readSource('CustomerNewsPreviewModal.tsx');
    expect(previewSource).not.toMatch(/createCustomerNews/);
    expect(previewSource).not.toMatch(/updateCustomerNews/);
    expect(previewSource).not.toMatch(/uploadNewsAttachment/);
    expect(previewSource).not.toMatch(/deleteCustomerNews/);
  });

  it('uses horizontal carousel only for multi-image mode', () => {
    const carouselSource = readSource('customerNewsImageCarousel.tsx');
    expect(carouselSource).toMatch(/customerNewsCarouselMode/);
    expect(carouselSource).toMatch(/horizontal/);
    expect(carouselSource).toMatch(/pagingEnabled/);
    expect(carouselSource).toMatch(/1} \/ \{urls\.length\}/);
  });

  it('keeps comments failures isolated from detail body rendering', () => {
    const screenSource = readSource('CustomerNewsScreen.tsx');
    expect(screenSource).toMatch(/comments\.isError/);
    expect(screenSource).toMatch(/resolveCustomerNewsBodySegments/);
    const commentsErrorIndex = screenSource.indexOf('comments.isError');
    const bodySegmentIndex = screenSource.indexOf('resolveCustomerNewsBodySegments');
    expect(bodySegmentIndex).toBeGreaterThan(-1);
    expect(commentsErrorIndex).toBeGreaterThan(bodySegmentIndex);
  });
});
