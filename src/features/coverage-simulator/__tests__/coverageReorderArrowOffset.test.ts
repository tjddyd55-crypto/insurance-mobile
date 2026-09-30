import { formatCoverageAmountLabel } from '../coverageAnalysis';
import { styles } from '../CoverageTimeline';
import {
  coverageAmountColumnWidth,
  coverageReorderLayout,
  measureCoverageAmountLabelWidth,
  originalAmountCenter,
  reorderArrowLeftOffset,
  reorderArrowStyleLeft,
  widestReorderArrowLeftOffset,
} from '../coverageReorderArrowOffset';

const MAN_WON = 10_000;

describe('coverage reorder arrow offset', () => {
  const columnWidth = coverageAmountColumnWidth(360);
  const arrowWidth = coverageReorderLayout.arrowColumnWidth;
  const slotWidth = columnWidth - arrowWidth;
  const center = originalAmountCenter(columnWidth, arrowWidth);

  const labels = {
    short: formatCoverageAmountLabel(300 * MAN_WON),
    mid: formatCoverageAmountLabel(5_000 * MAN_WON),
    widest: formatCoverageAmountLabel(99_999 * MAN_WON),
  };

  it('measures 천만원 through 5-digit 만원 labels at 18px', () => {
    expect(labels.short).toBe('300 만원');
    expect(labels.mid).toBe('5,000 만원');
    expect(labels.widest).toBe('99,999 만원');
    expect(measureCoverageAmountLabelWidth(labels.short)).toBeCloseTo(68.5938, 3);
    expect(measureCoverageAmountLabelWidth('1,000 만원')).toBeCloseTo(83.3125, 3);
    expect(measureCoverageAmountLabelWidth(labels.mid)).toBeCloseTo(83.3125, 3);
    expect(measureCoverageAmountLabelWidth(labels.widest)).toBeCloseTo(93.6406, 3);
  });

  it('keeps every label inside the original slot and clear of the arrows at 360dp', () => {
    expect(columnWidth).toBe(135);
    expect(slotWidth).toBe(107);
    expect(center).toBe(81.5);

    for (const label of [labels.short, labels.mid, labels.widest]) {
      const width = measureCoverageAmountLabelWidth(label);
      const textLeft = center - width / 2;
      const textRight = center + width / 2;
      expect(width).toBeLessThanOrEqual(slotWidth);
      expect(textLeft).toBeGreaterThanOrEqual(arrowWidth);
      expect(textRight).toBeLessThanOrEqual(columnWidth);
      expect(reorderArrowLeftOffset(width, columnWidth, arrowWidth)).toBe(0);
    }
  });

  it('sizes the arrow offset from 99,999 만원 and leaves shorter amounts on the same center', () => {
    const widest = measureCoverageAmountLabelWidth(labels.widest);
    const mid = measureCoverageAmountLabelWidth(labels.mid);
    const short = measureCoverageAmountLabelWidth(labels.short);
    const widestGap = center - widest / 2 - arrowWidth;
    const midGap = center - mid / 2 - arrowWidth;
    const shortGap = center - short / 2 - arrowWidth;

    expect(widestReorderArrowLeftOffset(arrowWidth)).toBe(0);
    expect(widestGap).toBeCloseTo(6.6797, 3);
    expect(midGap).toBeGreaterThan(widestGap);
    expect(shortGap).toBeGreaterThan(midGap);
    expect(styles.reorderOverlay.left).toBe(reorderArrowStyleLeft(styles.reorderVertical.width));
    expect(styles.amountSlotWithReorderInset.paddingLeft).toBe(styles.reorderVertical.width);
    expect('paddingHorizontal' in styles.amountSlotWithReorderInset).toBe(false);
    expect('paddingRight' in styles.amountSlotWithReorderInset).toBe(false);
    expect('paddingHorizontal' in styles.amountColumnProposed).toBe(false);
  });
});
