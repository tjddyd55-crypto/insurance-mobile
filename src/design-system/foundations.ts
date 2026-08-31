import type { TextStyle, ViewStyle } from 'react-native';

/**
 * ONE FC primitive design values.
 *
 * Product code must prefer semantic values from `themes.ts`. These primitives are
 * intentionally brand-agnostic building blocks that a designer can tune centrally.
 */
export const palette = {
  white: '#ffffff',
  black: '#000000',
  slate50: '#f8fafc',
  slate100: '#f1f5f9',
  slate200: '#e2e8f0',
  slate300: '#cbd5e1',
  slate400: '#94a3b8',
  slate500: '#64748b',
  slate600: '#475569',
  slate700: '#334155',
  slate800: '#1e293b',
  slate900: '#0f172a',
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray700: '#374151',
  gray900: '#111827',
  green50: '#f0fdf4',
  green100: '#dcfce7',
  green200: '#bbf7d0',
  green500: '#22c55e',
  green600: '#16a34a',
  green700: '#15803d',
  green800: '#166534',
  green950: '#052e16',
  blue50: '#eff6ff',
  blue600: '#2563eb',
  amber50: '#fffbeb',
  amber100: '#fef3c7',
  amber400: '#fbbf24',
  amber700: '#b45309',
  red50: '#fef2f2',
  red100: '#fee2e2',
  red200: '#fecaca',
  red500: '#ef4444',
  red600: '#dc2626',
  red700: '#b91c1c',
} as const;

/** 4pt grid. Named aliases preserve the M1 public API. */
export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 48,
} as const;

export const radius = {
  none: 0,
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  full: 999,
} as const;

export const controlSize = {
  sm: 36,
  md: 44,
  lg: 52,
  minimumTouchTarget: 44,
} as const;

export const typeScale = {
  display: 32,
  title: 24,
  heading: 20,
  subheading: 17,
  body: 15,
  label: 13,
  caption: 12,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extraBold: '800',
} as const satisfies Record<string, NonNullable<TextStyle['fontWeight']>>;

export const lineHeight = {
  display: 40,
  title: 32,
  heading: 28,
  subheading: 24,
  body: 22,
  label: 18,
  caption: 17,
} as const;

export const motion = {
  durationFast: 120,
  durationNormal: 200,
  durationSlow: 320,
} as const;

export const opacity = {
  pressed: 0.88,
  disabled: 0.45,
  subtle: 0.7,
} as const;

export const zIndex = {
  content: 0,
  sticky: 100,
  drawerBackdrop: 900,
  drawer: 901,
  modal: 9999,
  confirm: 10000,
  toast: 11000,
} as const;

export const shadows = {
  none: {} satisfies ViewStyle,
  card: {
    shadowColor: palette.slate900,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  } satisfies ViewStyle,
  floating: {
    shadowColor: palette.slate900,
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  } satisfies ViewStyle,
} as const;

export const foundations = {
  palette,
  spacing,
  radius,
  controlSize,
  typeScale,
  fontWeight,
  lineHeight,
  motion,
  opacity,
  zIndex,
  shadows,
} as const;
