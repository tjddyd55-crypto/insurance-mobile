/**
 * 네이티브 바이너리에는 PDF 래스터라이저가 없다.
 * DOM canvas가 있는 실행(Expo web)은 `pdfPageRaster.web.ts`가 이 함수를 대체한다.
 */
export async function renderPdfPageDataUrl(
  _cacheKey: string,
  _bytes: Uint8Array,
  _pageNumber: number,
  _maxWidth: number,
): Promise<string | null> {
  return null;
}
