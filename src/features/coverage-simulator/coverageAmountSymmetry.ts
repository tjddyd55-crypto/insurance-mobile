/**
 * 기존/제안 금액은 같은 너비의 절반 중앙에 둔다.
 * ↑↓는 그 사이 구분선 위에 겹치고, 금액 글자와 행 사이 + 버튼과는 떨어져 있다.
 * 자폭은 18px 굵은 글자 기준이다. 숫자·쉼표·공백은 Roboto Bold, 한글은 Noto Sans CJK KR Bold.
 */

const GLYPH_WIDTH = {
  digit: 10.3281,
  comma: 4.3906,
  space: 4.4844,
  hangul: 16.5625,
} as const;

export const coverageAmountFrame = {
  referenceScreenWidth: 360,
  screenPadding: 16,
  sheetBorder: 1,
  eventPadding: 16,
  spineWidth: 24,
} as const;

export function measureCoverageAmountLabelWidth(label: string): number {
  let width = 0;
  for (const char of label) {
    width += glyphWidth(char);
  }
  return width;
}

export function coverageAmountColumnWidth(
  screenWidth = coverageAmountFrame.referenceScreenWidth,
): number {
  const horizontalInset =
    (coverageAmountFrame.screenPadding +
      coverageAmountFrame.sheetBorder +
      coverageAmountFrame.eventPadding) *
    2;
  const rowWidth = screenWidth - horizontalInset;
  return (rowWidth - coverageAmountFrame.spineWidth) / 2;
}

/** 열 중앙에 둔 글자와 구분선 위 알약 가장자리 사이의 간격. 양수면 겹치지 않는다. */
export function labelGapBeforeCenterPill(
  labelWidth: number,
  columnWidth: number,
  spineWidth: number,
  pillWidth: number,
): number {
  const innerGap = (columnWidth - labelWidth) / 2;
  return innerGap + spineWidth / 2 - pillWidth / 2;
}

/** 금액 행에 세로 중앙 정렬된 화살표 하단과, 다음 행 + 버튼 상단 사이의 간격. */
export function arrowGapBeforeInsertButton(input: {
  compareMinHeight: number;
  arrowStackHeight: number;
  eventPaddingBottom: number;
  insertPaddingTop: number;
}): number {
  const arrowBottomInset = (input.compareMinHeight - input.arrowStackHeight) / 2;
  return arrowBottomInset + input.eventPaddingBottom + input.insertPaddingTop;
}

function glyphWidth(char: string): number {
  if (/\d/.test(char)) return GLYPH_WIDTH.digit;
  if (char === ',') return GLYPH_WIDTH.comma;
  if (char === ' ') return GLYPH_WIDTH.space;
  if (/[가-힣]/.test(char)) return GLYPH_WIDTH.hangul;
  return GLYPH_WIDTH.digit;
}
