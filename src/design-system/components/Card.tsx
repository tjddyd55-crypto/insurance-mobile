import { useMemo } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { useAppTheme } from '../DesignSystemProvider';
import type { AppTheme } from '../themes';

export type CardProps = ViewProps & {
  variant?: 'elevated' | 'outlined' | 'filled';
  padding?: 'none' | 'sm' | 'md' | 'lg';
};

export function Card({
  variant = 'elevated',
  padding = 'md',
  style,
  ...rest
}: CardProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return <View style={[styles.base, styles[variant], styles[`padding_${padding}`], style]} {...rest} />;
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    base: { borderRadius: theme.radius.lg },
    elevated: {
      backgroundColor: theme.colors.surfaceElevated,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      ...theme.shadows.card,
    },
    outlined: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    filled: { backgroundColor: theme.colors.surfaceSubtle },
    padding_none: { padding: 0 },
    padding_sm: { padding: theme.spacing.sm },
    padding_md: { padding: theme.spacing.lg },
    padding_lg: { padding: theme.spacing.xl },
  });
}
