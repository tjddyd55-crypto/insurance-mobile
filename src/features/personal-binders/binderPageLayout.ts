/** A4 세로. 페이지 픽셀을 알기 전의 기본 비율이다. */
export const BINDER_PAGE_WIDTH_OVER_HEIGHT = 210 / 297;

/**
 * 상담 책자 페이지는 좌우 여백 없이 뷰포트 가로를 모두 쓴다.
 * 세로는 원본 비율을 유지하고, 남는 높이는 호출 쪽에서 가운데 정렬한다.
 * 이후 서버 페이지 이미지를 붙여도 이 크기를 유지한다.
 */
export function edgeToEdgePageSize(
  viewportWidth: number,
  imageAspectWidthOverHeight = BINDER_PAGE_WIDTH_OVER_HEIGHT,
): { width: number; height: number } {
  const width = Math.max(0, viewportWidth);
  const aspect = imageAspectWidthOverHeight > 0 ? imageAspectWidthOverHeight : BINDER_PAGE_WIDTH_OVER_HEIGHT;
  return { width, height: width / aspect };
}
