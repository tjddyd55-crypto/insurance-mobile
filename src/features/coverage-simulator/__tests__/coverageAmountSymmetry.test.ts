import { formatCoverageAmountLabel, formatTotalAmountLabel } from '../coverageAnalysis';
import {
  arrowGapBeforeInsertButton,
  coverageAmountColumnWidth,
  labelGapBeforeCenterPill,
  measureCoverageAmountLabelWidth,
} from '../coverageAmountSymmetry';
import { styles, timelineLayout } from '../CoverageTimeline';

const MAN_WON = 10_000;

describe('coverage amount symmetry', () => {
  const columnWidth = coverageAmountColumnWidth(360);
  const pillWidth = styles.reorderVertical.width + styles.reorderPill.paddingHorizontal * 2;
  const arrowStackHeight = styles.reorderBtnCompact.height * 2 + styles.reorderPill.paddingVertical * 2;

  const labels = {
    short: formatCoverageAmountLabel(300 * MAN_WON),
    mid: formatCoverageAmountLabel(5_000 * MAN_WON),
    fiveDigit: formatCoverageAmountLabel(99_999 * MAN_WON),
    eok: formatTotalAmountLabel(120_000_000),
  };

  it('measures the four amount labels at 18px', () => {
    expect(labels.short).toBe('300 만원');
    expect(labels.mid).toBe('5,000 만원');
    expect(labels.fiveDigit).toBe('99,999 만원');
    expect(labels.eok).toBe('1억 2,000 만원');
    expect(measureCoverageAmountLabelWidth(labels.short)).toBeCloseTo(68.5938, 3);
    expect(measureCoverageAmountLabelWidth(labels.mid)).toBeCloseTo(83.3125, 3);
    expect(measureCoverageAmountLabelWidth(labels.fiveDigit)).toBeCloseTo(93.6406, 3);
    expect(measureCoverageAmountLabelWidth(labels.eok)).toBeCloseTo(114.6875, 3);
  });

  it('centers each label in an equal column and clears the divider arrows at 360dp', () => {
    expect(columnWidth).toBe(135);
    expect(styles.amountColumn.flex).toBe(styles.amountColumnProposed.flex);
    expect('paddingLeft' in styles.amountColumn).toBe(false);
    expect('paddingLeft' in styles.amountColumnProposed).toBe(false);
    expect(styles.amountSlot.alignItems).toBe('center');
    expect(styles.amountCurrent.textAlign).toBe('center');
    expect(styles.amountProposed.textAlign).toBe('center');

    for (const label of Object.values(labels)) {
      const width = measureCoverageAmountLabelWidth(label);
      expect(width).toBeLessThanOrEqual(columnWidth);
      expect(
        labelGapBeforeCenterPill(width, columnWidth, styles.compareSpine.width, pillWidth),
      ).toBeGreaterThanOrEqual(4);
    }
  });

  it('keeps the center arrows on the divider and clear of the insert button', () => {
    expect(styles.compare.position).toBe('relative');
    expect(styles.reorderOverlay.position).toBe('absolute');
    expect(styles.reorderOverlay.left).toBe(0);
    expect(styles.reorderOverlay.right).toBe(0);
    expect(styles.reorderOverlay.alignItems).toBe('center');
    expect(styles.reorderOverlay.justifyContent).toBe('center');
    expect(styles.reorderPill.backgroundColor).toBe('#ffffff');
    expect(styles.reorderVertical.flexDirection).toBe('column');
    expect(styles.reorderDisabled.opacity).toBe(0.28);
    expect(timelineLayout.reorderHitSlop).toBeGreaterThan(0);

    const gap = arrowGapBeforeInsertButton({
      compareMinHeight: styles.compare.minHeight,
      arrowStackHeight,
      eventPaddingBottom: styles.event.paddingVertical,
      insertPaddingTop: styles.add.paddingVertical,
    });
    expect(arrowStackHeight).toBeLessThanOrEqual(styles.compare.minHeight);
    expect(gap - timelineLayout.reorderHitSlop).toBeGreaterThan(0);
  });
});
