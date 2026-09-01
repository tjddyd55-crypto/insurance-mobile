import {
  controlSize,
  density,
  darkTheme,
  interaction,
  layout,
  lightTheme,
  spacing,
} from '..';

describe('ONE FC design system', () => {
  it('uses a 4pt spacing grid for product layout tokens', () => {
    for (const [name, value] of Object.entries(spacing)) {
      if (name === 'xxs') {
        continue;
      }
      expect(value % 4).toBe(0);
    }
  });

  it('keeps interactive controls at or above the minimum touch target', () => {
    expect(controlSize.md).toBeGreaterThanOrEqual(controlSize.minimumTouchTarget);
    expect(controlSize.lg).toBeGreaterThanOrEqual(controlSize.minimumTouchTarget);
    expect(
      controlSize.sm + interaction.compactHitSlop * 2,
    ).toBeGreaterThanOrEqual(interaction.minimumTouchTarget);
  });

  it('separates compact visual density from interaction accessibility', () => {
    expect(density.compact.controlVisualHeight).toBeLessThan(interaction.minimumTouchTarget);
    expect(density.normal.controlVisualHeight).toBe(interaction.minimumTouchTarget);
  });

  it('defines semantic layout metrics on the spacing grid', () => {
    expect(layout.screenPaddingHorizontal).toBe(spacing.lg);
    expect(layout.compactListGap).toBe(spacing.sm);
    expect(layout.headerHeight).toBe(interaction.minimumTouchTarget + spacing.xs);
  });

  it('defines every semantic color in both themes', () => {
    expect(Object.keys(darkTheme.colors).sort()).toEqual(Object.keys(lightTheme.colors).sort());
    for (const value of Object.values(lightTheme.colors)) {
      expect(value).toEqual(expect.any(String));
      expect(value.length).toBeGreaterThan(0);
    }
    for (const value of Object.values(darkTheme.colors)) {
      expect(value).toEqual(expect.any(String));
      expect(value.length).toBeGreaterThan(0);
    }
  });

  it('uses semantic foreground/background contrast roles instead of shared values', () => {
    expect(lightTheme.colors.primary).not.toBe(lightTheme.colors.onPrimary);
    expect(darkTheme.colors.background).not.toBe(darkTheme.colors.text);
    expect(lightTheme.colors.danger).not.toBe(lightTheme.colors.dangerSoft);
  });
});
