import { useMemo } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { useAppTheme } from '../DesignSystemProvider';
import type { AppTheme } from '../themes';
import { AppText } from './AppText';

export type BadgeTone = 'default' | 'success' | 'warning' | 'danger' | 'info';

export type BadgeProps = ViewProps & {
  label: string;
  tone?: BadgeTone;
  size?: 'sm' | 'md';
};

export function Badge({ label, tone = 'default', size = 'sm', style, ...rest }: BadgeProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={[styles.base, styles[tone], styles[size], style]} {...rest}>
      <AppText variant="caption" style={[styles.text, styles[`${tone}Text`]]}>
        {label}
      </AppText>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    base: { borderRadius: theme.radius.full, alignSelf: 'flex-start' },
    sm: { paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xxs },
    md: { paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.xs },
    default: { backgroundColor: theme.colors.surfaceSubtle },
    success: { backgroundColor: theme.colors.successSoft },
    warning: { backgroundColor: theme.colors.warningSoft },
    danger: { backgroundColor: theme.colors.dangerSoft },
    info: { backgroundColor: theme.colors.infoSoft },
    text: { fontWeight: '700' },
    defaultText: { color: theme.colors.textSecondary },
    successText: { color: theme.colors.success },
    warningText: { color: theme.colors.warningText },
    dangerText: { color: theme.colors.danger },
    infoText: { color: theme.colors.info },
  });
}
