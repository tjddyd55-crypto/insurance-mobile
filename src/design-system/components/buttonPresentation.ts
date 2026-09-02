import type { AppTheme } from '../themes';
import type { ButtonVariant } from './Button';

/**
 * Native mobile button presentation SSOT.
 * Filled green is reserved for future policy; actions/selected must not use it now.
 */
export function resolveButtonSurfaceStyle(
  theme: AppTheme,
  variant: ButtonVariant,
): { backgroundColor: string; borderColor: string } {
  switch (variant) {
    case 'primary':
      return {
        backgroundColor: theme.colors.text,
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
      return theme.colors.surface;
    case 'selected':
      return theme.colors.text;
    case 'danger':
      return theme.colors.danger;
    case 'ghost':
      return theme.colors.textSecondary;
    case 'secondary':
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
