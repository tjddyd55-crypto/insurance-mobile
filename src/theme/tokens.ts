/**
 * M1 compatibility facade.
 *
 * New code must consume `useAppTheme()` or components from `src/design-system`.
 * This light-theme facade remains only while the foundation screens are migrated.
 */
import { lightTheme, palette, shadows } from '../design-system';

export { spacing, radius } from '../design-system';

export const colors = {
  bgBase: lightTheme.colors.background,
  bgSurface: lightTheme.colors.surface,
  bgSoft: lightTheme.colors.surfaceSubtle,
  border: lightTheme.colors.border,
  borderStrong: lightTheme.colors.borderStrong,
  textPrimary: lightTheme.colors.text,
  textSecondary: lightTheme.colors.textSecondary,
  textMuted: lightTheme.colors.textMuted,
  primary: lightTheme.colors.primary,
  primaryHover: palette.green700,
  primaryActive: lightTheme.colors.primaryPressed,
  primarySoft: lightTheme.colors.primarySoft,
  textOnPrimary: lightTheme.colors.onPrimary,
  brandDark: lightTheme.colors.brandStrong,
  danger: lightTheme.colors.danger,
  warning: lightTheme.colors.warning,
  info: lightTheme.colors.info,
  overlay: lightTheme.colors.overlay,
} as const;

export const typography = {
  title: lightTheme.typography.title,
  heading: lightTheme.typography.heading,
  body: lightTheme.typography.body,
  caption: lightTheme.typography.caption,
  label: lightTheme.typography.label,
} as const;

export const shadow = { card: shadows.card } as const;

export const theme = { ...lightTheme, colors, typography, shadow } as const;
