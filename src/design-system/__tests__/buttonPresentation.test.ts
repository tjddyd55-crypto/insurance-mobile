import { lightTheme } from '..';
import {
  resolveButtonContentColor,
  resolveButtonSurfaceStyle,
  usesFilledGreenAction,
} from '../components/buttonPresentation';

describe('buttonPresentation', () => {
  it('primary action is neutral strong, not filled green', () => {
    const surface = resolveButtonSurfaceStyle(lightTheme, 'primary');
    expect(surface.backgroundColor).toBe(lightTheme.colors.text);
    expect(surface.backgroundColor).not.toBe(lightTheme.colors.primary);
    expect(usesFilledGreenAction(lightTheme, 'primary')).toBe(false);
    expect(resolveButtonContentColor(lightTheme, 'primary')).toBe(lightTheme.colors.surface);
  });

  it('selected uses green outline/tint without filled green', () => {
    const surface = resolveButtonSurfaceStyle(lightTheme, 'selected');
    expect(surface.backgroundColor).toBe(lightTheme.colors.primarySoft);
    expect(surface.borderColor).toBe(lightTheme.colors.primary);
    expect(surface.backgroundColor).not.toBe(lightTheme.colors.primary);
    expect(usesFilledGreenAction(lightTheme, 'selected')).toBe(false);
    expect(resolveButtonContentColor(lightTheme, 'selected')).toBe(lightTheme.colors.text);
  });

  it('secondary and danger stay non-green-filled', () => {
    expect(usesFilledGreenAction(lightTheme, 'secondary')).toBe(false);
    expect(usesFilledGreenAction(lightTheme, 'danger')).toBe(false);
    expect(usesFilledGreenAction(lightTheme, 'ghost')).toBe(false);
  });
});
