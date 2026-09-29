import { styles } from '../CoverageTimeline';
import { simulatorTheme } from '../simulatorTheme';

describe('coverage timeline axis', () => {
  it('masks the center line on the item name row and leaves it between the amounts', () => {
    expect(styles.head.backgroundColor).toBe(simulatorTheme.surface);
    expect(styles.centerLine.zIndex).toBeLessThan(0);
    expect(styles.head.zIndex).toBeGreaterThan(styles.centerLine.zIndex ?? 0);
    expect(styles.eventTitle.backgroundColor).toBe(simulatorTheme.surface);
    expect(styles.eventTitle.paddingHorizontal).toBe(8);
    expect('backgroundColor' in styles.compare).toBe(false);
    expect('backgroundColor' in styles.compareSpine).toBe(false);
  });

  it('shows a circle plus for insert, matching the mobile timeline control', () => {
    expect(styles.addPlus.width).toBe(22);
    expect(styles.addPlus.height).toBe(22);
    expect(styles.addPlus.borderRadius).toBe(11);
    expect(styles.addPlus.borderColor).toBe('#b8c8dc');
    expect(styles.addPlus.backgroundColor).toBe('#ffffff');
    expect(styles.addGlyph.color).toBe(simulatorTheme.primary);
    expect(styles.addLine.backgroundColor).toBe('#dce3ec');
  });

  it('keeps the period subtotal and time marker rows on the shared axis', () => {
    expect(styles.centerLine.top).toBe(0);
    expect(styles.centerLine.bottom).toBe(0);
    expect(styles.period.backgroundColor).not.toBe(simulatorTheme.surface);
    expect(styles.marker.backgroundColor).toBe('#f8fafc');
    expect(styles.sideSlotFixed.width).toBe(100);
    expect(styles.eventTitle.textAlign).toBe('center');
    expect(styles.periodHeading.fontSize).toBe(14);
    expect(styles.markerSeg.height).toBe(2);
    expect(styles.markerSeg.backgroundColor).toBe(simulatorTheme.primary);
    expect(styles.markerLabel.fontWeight).toBe('900');
    expect(styles.markerLabel.color).toBe('#0f172a');
    expect(styles.periodSpine.width).toBe(12);
  });

  it('uses the mobile preview dock colors for the compact total bar', () => {
    expect(styles.dock.height).toBe(54);
    expect(styles.dockLabel.color).toBe(simulatorTheme.muted);
    expect(styles.dockAmount.color).toBe('#0f172a');
    expect(styles.dockProposed.color).toBe(simulatorTheme.primary);
    expect(styles.reorderBtn.width).toBe(36);
    expect(styles.reorderDisabled.opacity).toBe(0.28);
  });
});
