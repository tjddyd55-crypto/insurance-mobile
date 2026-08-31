import { controlSize, darkTheme, lightTheme, spacing } from '..';

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
