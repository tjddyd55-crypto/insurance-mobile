import type { TextStyle } from 'react-native';

import {
  controlSize,
  fontWeight,
  lineHeight,
  motion,
  opacity,
  palette,
  radius,
  shadows,
  spacing,
  typeScale,
  zIndex,
} from './foundations';

export type ThemeScheme = 'light' | 'dark';

export type SemanticColors = {
  background: string;
  surface: string;
  surfaceSubtle: string;
  surfaceElevated: string;
  border: string;
  borderStrong: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  textDisabled: string;
  primary: string;
  primaryPressed: string;
  primarySoft: string;
  primaryBorder: string;
  onPrimary: string;
  brandStrong: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  warningText: string;
  danger: string;
  dangerSoft: string;
  dangerBorder: string;
  info: string;
  infoSoft: string;
  overlay: string;
  inputBackground: string;
  inputBorder: string;
  inputFocusBorder: string;
  disabledBackground: string;
};

const lightColors: SemanticColors = {
  background: palette.slate50,
  surface: palette.white,
  surfaceSubtle: palette.slate100,
  surfaceElevated: palette.white,
  border: palette.gray200,
  borderStrong: palette.gray300,
  text: palette.gray900,
  textSecondary: palette.gray500,
  textMuted: palette.gray400,
  textDisabled: palette.gray400,
  primary: palette.green600,
  primaryPressed: palette.green800,
  primarySoft: palette.green100,
  primaryBorder: palette.green200,
  onPrimary: palette.white,
  brandStrong: '#003d1f',
  success: palette.green600,
  successSoft: palette.green100,
  warning: palette.amber400,
  warningSoft: palette.amber100,
  warningText: palette.amber700,
  danger: palette.red600,
  dangerSoft: palette.red100,
  dangerBorder: palette.red200,
  info: palette.blue600,
  infoSoft: palette.blue50,
  overlay: 'rgba(15, 23, 42, 0.45)',
  inputBackground: palette.white,
  inputBorder: palette.gray200,
  inputFocusBorder: palette.green600,
  disabledBackground: palette.gray100,
};

const darkColors: SemanticColors = {
  background: '#0f141b',
  surface: '#161d27',
  surfaceSubtle: '#2a313c',
  surfaceElevated: '#232d3a',
  border: '#2b3544',
  borderStrong: '#3a4658',
  text: '#e6ecf2',
  textSecondary: '#9aa5b1',
  textMuted: '#6b7785',
  textDisabled: '#6b7785',
  primary: palette.green500,
  primaryPressed: palette.green700,
  primarySoft: 'rgba(34, 197, 94, 0.16)',
  primaryBorder: 'rgba(34, 197, 94, 0.35)',
  onPrimary: '#0f141b',
  brandStrong: palette.green500,
  success: palette.green500,
  successSoft: 'rgba(34, 197, 94, 0.16)',
  warning: palette.amber400,
  warningSoft: 'rgba(251, 191, 36, 0.14)',
  warningText: '#fde68a',
  danger: palette.red500,
  dangerSoft: 'rgba(239, 68, 68, 0.14)',
  dangerBorder: 'rgba(248, 113, 113, 0.32)',
  info: '#3b82f6',
  infoSoft: 'rgba(59, 130, 246, 0.14)',
  overlay: 'rgba(0, 0, 0, 0.62)',
  inputBackground: '#1e2633',
  inputBorder: '#2b3544',
  inputFocusBorder: palette.green500,
  disabledBackground: '#2a313c',
};

function createTypography(colors: SemanticColors) {
  return {
    display: {
      fontSize: typeScale.display,
      lineHeight: lineHeight.display,
      fontWeight: fontWeight.extraBold,
      color: colors.text,
    },
    title: {
      fontSize: typeScale.title,
      lineHeight: lineHeight.title,
      fontWeight: fontWeight.bold,
      color: colors.text,
    },
    heading: {
      fontSize: typeScale.heading,
      lineHeight: lineHeight.heading,
      fontWeight: fontWeight.semibold,
      color: colors.text,
    },
    subheading: {
      fontSize: typeScale.subheading,
      lineHeight: lineHeight.subheading,
      fontWeight: fontWeight.semibold,
      color: colors.text,
    },
    body: {
      fontSize: typeScale.body,
      lineHeight: lineHeight.body,
      fontWeight: fontWeight.regular,
      color: colors.text,
    },
    bodyStrong: {
      fontSize: typeScale.body,
      lineHeight: lineHeight.body,
      fontWeight: fontWeight.semibold,
      color: colors.text,
    },
    label: {
      fontSize: typeScale.label,
      lineHeight: lineHeight.label,
      fontWeight: fontWeight.semibold,
      color: colors.textSecondary,
    },
    caption: {
      fontSize: typeScale.caption,
      lineHeight: lineHeight.caption,
      fontWeight: fontWeight.regular,
      color: colors.textSecondary,
    },
    button: {
      fontSize: typeScale.body,
      lineHeight: lineHeight.body,
      fontWeight: fontWeight.semibold,
    },
  } as const satisfies Record<string, TextStyle>;
}

export type AppTheme = ReturnType<typeof createTheme>;

function createTheme(scheme: ThemeScheme, colors: SemanticColors) {
  return {
    scheme,
    colors,
    spacing,
    radius,
    controlSize,
    typography: createTypography(colors),
    shadows,
    motion,
    opacity,
    zIndex,
  } as const;
}

export const lightTheme = createTheme('light', lightColors);
export const darkTheme = createTheme('dark', darkColors);

export function getTheme(scheme: ThemeScheme): AppTheme {
  return scheme === 'dark' ? darkTheme : lightTheme;
}
