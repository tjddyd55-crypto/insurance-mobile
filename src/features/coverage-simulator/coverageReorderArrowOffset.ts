/**
 * 기존 보장 금액은 ad0afc8 이전 자리(화살표 열 오른쪽 슬롯의 중앙)에 둔다.
 * ↑↓는 그 슬롯과 겹칠 때만 화면 가장자리 쪽으로 옮긴다.
 * 자폭은 18px 굵은 글자 기준이다. 숫자·쉼표·공백은 Roboto Bold, 한글은 Noto Sans CJK KR Bold.
 */

const GLYPH_WIDTH = {
  digit: 10.3281,
  comma: 4.3906,
  space: 4.4844,
  hangul: 16.5625,
} as const;

export const coverageReorderLayout = {
  referenceScreenWidth: 360,
  screenPadding: 16,
  sheetBorder: 1,
  eventPadding: 16,
  spineWidth: 24,
  arrowColumnWidth: 28,
} as const;

export function measureCoverageAmountLabelWidth(label: string): number {
  let width = 0;
  for (const char of label) {
    width += glyphWidth(char);
  }
  return width;
}

export function coverageAmountColumnWidth(
  screenWidth = coverageReorderLayout.referenceScreenWidth,
): number {
  const horizontalInset =
    (coverageReorderLayout.screenPadding +
      coverageReorderLayout.sheetBorder +
      coverageReorderLayout.eventPadding) *
    2;
  const rowWidth = screenWidth - horizontalInset;
  return (rowWidth - coverageReorderLayout.spineWidth) / 2;
}

/** 화살표 열을 뺀 슬롯의 중앙. ad0afc8 이전 금액 중심과 같다. */
export function originalAmountCenter(columnWidth: number, arrowColumnWidth: number): number {
  const slotWidth = columnWidth - arrowColumnWidth;
  return arrowColumnWidth + slotWidth / 2;
}

/**
 * 금액 글자 왼쪽 끝이 화살표 오른쪽 끝보다 왼쪽이면 그 겹친 만큼만 음수 left로 옮긴다.
 * 겹치지 않으면 0이다.
 */
export function reorderArrowLeftOffset(
  labelWidth: number,
  columnWidth: number,
  arrowColumnWidth: number,
): number {
  const slotWidth = columnWidth - arrowColumnWidth;
  const textLeft = arrowColumnWidth + (slotWidth - labelWidth) / 2;
  const overlap = arrowColumnWidth - textLeft;
  return overlap > 0 ? overlap : 0;
}

export function widestReorderArrowLeftOffset(arrowColumnWidth: number): number {
  const columnWidth = coverageAmountColumnWidth();
  const labelWidth = measureCoverageAmountLabelWidth('99,999 만원');
  return reorderArrowLeftOffset(labelWidth, columnWidth, arrowColumnWidth);
}

/** 스타일의 left. 겹침이 없으면 0, 있으면 화면 가장자리 쪽 음수. */
export function reorderArrowStyleLeft(arrowColumnWidth: number): number {
  const offset = widestReorderArrowLeftOffset(arrowColumnWidth);
  return offset === 0 ? 0 : -offset;
}

function glyphWidth(char: string): number {
  if (/\d/.test(char)) return GLYPH_WIDTH.digit;
  if (char === ',') return GLYPH_WIDTH.comma;
  if (char === ' ') return GLYPH_WIDTH.space;
  if (/[가-힣]/.test(char)) return GLYPH_WIDTH.hangul;
  return GLYPH_WIDTH.digit;
}
