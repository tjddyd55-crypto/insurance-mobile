import { lightTheme } from '..';
import {
  resolveButtonContentColor,
  resolveButtonSurfaceStyle,
  usesFilledDarkAction,
  usesFilledGreenAction,
} from '../components/buttonPresentation';

const ALL_VARIANTS = [
  'primary',
  'secondary',
  'action',
  'actionEmphasis',
  'selected',
  'danger',
  'ghost',
] as const;

describe('buttonPresentation', () => {
  it('forbids filled green and filled dark for every action variant', () => {
    for (const variant of ALL_VARIANTS) {
      expect(usesFilledGreenAction(lightTheme, variant)).toBe(false);
      expect(usesFilledDarkAction(lightTheme, variant)).toBe(false);
    }
  });

  it('maps primary/actionEmphasis to surface with strong border', () => {
    for (const variant of ['primary', 'actionEmphasis'] as const) {
      const surface = resolveButtonSurfaceStyle(lightTheme, variant);
      expect(surface.backgroundColor).toBe(lightTheme.colors.surface);
      expect(surface.borderColor).toBe(lightTheme.colors.text);
      expect(resolveButtonContentColor(lightTheme, variant)).toBe(
        lightTheme.colors.text,
      );
    }
  });

  it('maps action/secondary to surface with neutral border', () => {
    for (const variant of ['action', 'secondary'] as const) {
      const surface = resolveButtonSurfaceStyle(lightTheme, variant);
      expect(surface.backgroundColor).toBe(lightTheme.colors.surface);
      expect(surface.borderColor).toBe(lightTheme.colors.border);
      expect(resolveButtonContentColor(lightTheme, variant)).toBe(
        lightTheme.colors.text,
      );
    }
  });

  it('selected uses green outline/tint without filled green', () => {
    const surface = resolveButtonSurfaceStyle(lightTheme, 'selected');
    expect(surface.backgroundColor).toBe(lightTheme.colors.primarySoft);
    expect(surface.borderColor).toBe(lightTheme.colors.primary);
    expect(surface.backgroundColor).not.toBe(lightTheme.colors.primary);
    expect(usesFilledGreenAction(lightTheme, 'selected')).toBe(false);
    expect(resolveButtonContentColor(lightTheme, 'selected')).toBe(
      lightTheme.colors.text,
    );
  });
});
