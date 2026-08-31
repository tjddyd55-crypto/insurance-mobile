/**
 * ONE FC brand tokens — ported from insurance `src/styles/tokens.css`.
 * Do not copy JJOINZONE colors.
 */

export const colors = {
  bgBase: '#f8fafc',
  bgSurface: '#ffffff',
  bgSoft: '#f1f5f9',
  border: '#e5e7eb',
  borderStrong: '#d1d5db',
  textPrimary: '#111827',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',
  primary: '#16a34a',
  primaryHover: '#15803d',
  primaryActive: '#166534',
  primarySoft: '#dcfce7',
  textOnPrimary: '#ffffff',
  brandDark: '#003D1F',
  danger: '#dc2626',
  warning: '#ffbb00',
  info: '#2563eb',
  overlay: 'rgba(15, 23, 42, 0.45)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
} as const;

export const typography = {
  title: { fontSize: 22, fontWeight: '700' as const, color: colors.textPrimary },
  heading: { fontSize: 18, fontWeight: '600' as const, color: colors.textPrimary },
  body: { fontSize: 15, fontWeight: '400' as const, color: colors.textPrimary },
  caption: { fontSize: 13, fontWeight: '400' as const, color: colors.textSecondary },
  label: { fontSize: 13, fontWeight: '600' as const, color: colors.textSecondary },
} as const;

export const shadow = {
  card: {
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
} as const;

export const theme = { colors, spacing, radius, typography, shadow } as const;
