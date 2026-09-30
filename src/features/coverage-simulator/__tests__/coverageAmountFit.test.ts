import { formatCoverageAmountLabel, formatTotalAmountLabel } from '../coverageAnalysis';
import {
  coverageAmountLabelFits,
  coverageAmountLayout,
  coverageAmountMinimumFontScale,
  coverageAmountTextBudget,
  coverageCompareColumnWidth,
  pdfCoverageAmountFontSize,
} from '../coverageAmountFit';

const WIDEST = ['99,999 만원', '1억 2,000 만원', '10,000 만원', '5,000 만원', '1,000 만원'] as const;

describe('coverage amount fit at 360dp', () => {
  const columnWidth = coverageCompareColumnWidth(coverageAmountLayout.referenceScreenWidth);
  const arrowBudget = coverageAmountTextBudget(columnWidth, true);
  const openBudget = coverageAmountTextBudget(columnWidth, false);
  const minimumScale = coverageAmountMinimumFontScale();
  const fittedFont = coverageAmountLayout.baseFontSize * minimumScale;

  it('keeps the amount centered and clear of the reorder arrows', () => {
    expect(columnWidth).toBeGreaterThan(coverageAmountLayout.arrowWidth * 2);
    expect(arrowBudget).toBe(columnWidth - coverageAmountLayout.arrowWidth * 2);
    expect(arrowBudget).toBeGreaterThan(0);
    expect(openBudget).toBe(columnWidth);
  });

  it('fits the widest existing and proposed labels inside the arrow-safe budget', () => {
    for (const label of WIDEST) {
      expect(coverageAmountLabelFits(label, fittedFont, arrowBudget)).toBe(true);
    }
    expect(coverageAmountLabelFits('9억 9,999 만원', fittedFont, arrowBudget)).toBe(true);
  });

  it('formats those widest values the way the timeline and pdf show them', () => {
    expect(formatCoverageAmountLabel(99_999 * 10_000)).toBe('99,999 만원');
    expect(formatCoverageAmountLabel(10_000 * 10_000)).toBe('10,000 만원');
    expect(formatCoverageAmountLabel(1_000 * 10_000)).toBe('1,000 만원');
    expect(formatTotalAmountLabel(120_000_000)).toBe('1억 2,000 만원');
  });

  it('uses a pdf font that keeps the same labels on one line at 360px', () => {
    const pageWidth = coverageAmountLayout.referenceScreenWidth;
    const cellInner =
      (pageWidth - coverageAmountLayout.pdfPageMargin * 2) / 2
      - coverageAmountLayout.pdfCellPadding * 2;
    const fontSize = pdfCoverageAmountFontSize(pageWidth);
    for (const label of [...WIDEST, '9억 9,999 만원']) {
      expect(coverageAmountLabelFits(label, fontSize, cellInner)).toBe(true);
    }
  });
});
