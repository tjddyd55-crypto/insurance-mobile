import {
  binderSectionJumps,
  forgetPageImageLink,
  fullPageImageWidth,
  isPageImageLinkFresh,
  normalizeBinderViewerPages,
  pageImageRequestKey,
  readCachedPageImageLink,
  rememberPageImageLink,
} from '../binderPageImage';

describe('binder page images', () => {
  it('asks for 1080 or 1440 based on the device pixel width', () => {
    expect(fullPageImageWidth(780)).toBe(1080);
    expect(fullPageImageWidth(1260)).toBe(1080);
    expect(fullPageImageWidth(1261)).toBe(1440);
    expect(fullPageImageWidth(Number.NaN)).toBe(1080);
  });

  it('keeps viewer order and section jumps from the page list', () => {
    const list = normalizeBinderViewerPages({
      binderId: '23',
      title: '상담책',
      pageCount: 2,
      pages: [
        { index: 2, sectionId: '9', sectionTitle: '청구', itemId: '10', materialId: '13', fileId: 4, mimeType: 'application/pdf', kind: 'pdf', pdfPageNumber: 2 },
        { index: 1, sectionId: '8', sectionTitle: '보장', itemId: '9', materialId: '13', fileId: 4, mimeType: 'application/pdf', kind: 'pdf', pdfPageNumber: 1 },
      ],
    });
    expect(list.pages.map((page) => page.index)).toEqual([1, 2]);
    expect(list.pages[0]?.kind).toBe('pdf');
    expect(binderSectionJumps(list.pages)).toEqual([
      { sectionId: '8', title: '보장', position: 0 },
      { sectionId: '9', title: '청구', position: 1 },
    ]);
  });

  it('drops a cached open URL shortly before it expires', () => {
    const key = pageImageRequestKey({ scope: 'binder-thumb', binderId: '23', index: 1 });
    rememberPageImageLink(key, {
      openUrl: 'https://insurance-dev.up.railway.app/api/personal-binders/page-images/open/token',
      expiresAt: '2026-09-26T06:50:00.000Z',
      width: 240,
    });
    const now = Date.parse('2026-09-26T06:49:50.000Z');
    expect(isPageImageLinkFresh('2026-09-26T06:50:00.000Z', now)).toBe(false);
    expect(readCachedPageImageLink(key, now)).toBeNull();
    forgetPageImageLink(key);
  });
});
