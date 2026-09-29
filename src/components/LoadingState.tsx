import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText, useAppTheme, type AppTheme } from '../design-system';

export function LoadingState({
  message = '불러오는 중…',
  compact = false,
}: {
  message?: string;
  compact?: boolean;
}) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={[styles.wrap, compact && styles.compact]}>
      <ActivityIndicator color={theme.colors.primary} size={compact ? 'small' : 'large'} />
      <AppText variant="helper" align="center">{message}</AppText>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    wrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.md,
      padding: theme.spacing.xl,
    },
    compact: {
      flex: 0,
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.sm,
    },
  });
}
