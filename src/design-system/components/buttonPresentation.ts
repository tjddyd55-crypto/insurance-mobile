import type { AppTheme } from '../themes';
import type { ButtonVariant } from './Button';

/**
 * Native mobile button presentation SSOT.
 *
 * - action / secondary: surface + neutral border (default)
 * - actionEmphasis / primary: surface + stronger border (no black/green fill)
 * - selected: soft tint + brand outline
 * - ghost / danger: as named
 *
 * Filled green and black/dark filled actions are forbidden.
 */
export function resolveButtonSurfaceStyle(
  theme: AppTheme,
  variant: ButtonVariant,
): { backgroundColor: string; borderColor: string } {
  switch (variant) {
    case 'primary':
    case 'actionEmphasis':
      return {
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.text,
      };
    case 'selected':
      return {
        backgroundColor: theme.colors.primarySoft,
        borderColor: theme.colors.primary,
      };
    case 'danger':
      return {
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.dangerBorder,
      };
    case 'ghost':
      return {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
      };
    case 'action':
    case 'secondary':
    default:
      return {
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
      };
  }
}

export function resolveButtonContentColor(
  theme: AppTheme,
  variant: ButtonVariant,
): string {
  switch (variant) {
    case 'primary':
    case 'actionEmphasis':
    case 'action':
    case 'secondary':
    case 'selected':
      return theme.colors.text;
    case 'danger':
      return theme.colors.danger;
    case 'ghost':
      return theme.colors.textSecondary;
    default:
      return theme.colors.text;
  }
}

export function usesFilledGreenAction(
  theme: AppTheme,
  variant: ButtonVariant,
): boolean {
  const surface = resolveButtonSurfaceStyle(theme, variant);
  return (
    surface.backgroundColor === theme.colors.primary ||
    surface.backgroundColor === theme.colors.success
  );
}

export function usesFilledDarkAction(
  theme: AppTheme,
  variant: ButtonVariant,
): boolean {
  const surface = resolveButtonSurfaceStyle(theme, variant);
  const content = resolveButtonContentColor(theme, variant);
  return (
    surface.backgroundColor === theme.colors.text ||
    surface.backgroundColor === theme.colors.textSecondary ||
    (surface.backgroundColor !== theme.colors.surface &&
      surface.backgroundColor !== 'transparent' &&
      content === theme.colors.surface)
  );
}
