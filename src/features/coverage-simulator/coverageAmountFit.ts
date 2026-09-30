/**
 * 360dp 화면에서 기존/제안 금액이 칸 안에 들어가게 글자 크기를 정한다.
 * 금액은 열 중앙에 두고, ↑↓ 너비만큼 양쪽을 비워야 화살표와 겹치지 않는다.
 */

export const coverageAmountLayout = {
  referenceScreenWidth: 360,
  screenPadding: 16,
  eventPadding: 16,
  spineWidth: 24,
  arrowWidth: 28,
  baseFontSize: 18,
  pdfPageMargin: 24,
  pdfCellPadding: 4,
  pdfBaseFontSize: 13,
} as const;

const WIDEST_AMOUNT_LABELS = ['99,999 만원', '10,000 만원', '1억 2,000 만원', '9억 9,999 만원'] as const;

export function estimateCoverageAmountWidth(label: string, fontSize: number): number {
  let em = 0;
  for (const char of label) {
    em += glyphEm(char);
  }
  return em * fontSize * 1.12;
}

export function coverageCompareColumnWidth(screenWidth: number): number {
  const horizontalInset = (coverageAmountLayout.screenPadding + coverageAmountLayout.eventPadding) * 2;
  const rowWidth = screenWidth - horizontalInset;
  return (rowWidth - coverageAmountLayout.spineWidth) / 2;
}

/** 열 중앙 정렬을 유지하면서 ↑↓와 겹치지 않는 글자 폭. */
export function coverageAmountTextBudget(columnWidth: number, reserveArrows: boolean): number {
  if (!reserveArrows) return columnWidth;
  return columnWidth - coverageAmountLayout.arrowWidth * 2;
}

export function fittedCoverageAmountFontSize(label: string, budget: number, baseFontSize: number): number {
  const natural = estimateCoverageAmountWidth(label, baseFontSize);
  if (natural <= budget) return baseFontSize;
  return (baseFontSize * budget) / natural;
}

export function coverageAmountMinimumFontScale(
  screenWidth = coverageAmountLayout.referenceScreenWidth,
): number {
  const columnWidth = coverageCompareColumnWidth(screenWidth);
  const budget = coverageAmountTextBudget(columnWidth, true);
  const smallest = Math.min(
    ...WIDEST_AMOUNT_LABELS.map((label) =>
      fittedCoverageAmountFontSize(label, budget, coverageAmountLayout.baseFontSize),
    ),
  );
  return Math.floor((smallest / coverageAmountLayout.baseFontSize) * 100) / 100;
}

export function pdfCoverageAmountFontSize(
  pageWidth = coverageAmountLayout.referenceScreenWidth,
): number {
  const contentWidth = pageWidth - coverageAmountLayout.pdfPageMargin * 2;
  const cellInner = contentWidth / 2 - coverageAmountLayout.pdfCellPadding * 2;
  const smallest = Math.min(
    ...WIDEST_AMOUNT_LABELS.map((label) =>
      fittedCoverageAmountFontSize(label, cellInner, coverageAmountLayout.pdfBaseFontSize),
    ),
  );
  return Math.floor(smallest * 10) / 10;
}

export function coverageAmountLabelFits(
  label: string,
  fontSize: number,
  budget: number,
): boolean {
  return estimateCoverageAmountWidth(label, fontSize) <= budget + 0.5;
}

function glyphEm(char: string): number {
  if (/\d/.test(char)) return 0.62;
  if (char === ',' || char === '.') return 0.34;
  if (/\s/.test(char)) return 0.33;
  if (/[가-힣]/.test(char)) return 1.08;
  return 0.7;
}
