import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, useAppTheme, type AppTheme } from '../design-system';

export function EmptyState({
  title = '항목 없음',
  message,
  compact = false,
}: {
  title?: string;
  message?: string;
  compact?: boolean;
}) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={[styles.wrap, compact && styles.compact]}>
      <AppText variant={compact ? 'bodyStrong' : 'sectionTitle'} align="center">
        {title}
      </AppText>
      {message ? (
        <AppText variant={compact ? 'caption' : 'body'} color="textSecondary" align="center">
          {message}
        </AppText>
      ) : null}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    wrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      padding: theme.spacing.xl,
    },
    compact: {
      flex: 0,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.sm,
    },
  });
}
