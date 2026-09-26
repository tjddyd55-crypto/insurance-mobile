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

  it('keeps the period subtotal and time marker rows on the shared axis', () => {
    expect(styles.centerLine.top).toBe(0);
    expect(styles.centerLine.bottom).toBe(0);
    expect(styles.period.backgroundColor).not.toBe(simulatorTheme.surface);
    expect(styles.marker.backgroundColor).toBe('#f8fafc');
    expect(styles.periodSpine.width).toBe(12);
  });
});
