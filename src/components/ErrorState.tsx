import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, useAppTheme, type AppTheme } from '../design-system';

type ErrorStateProps = {
  title?: string;
  message: string;
  onRetry?: () => void;
  compact?: boolean;
};

export function ErrorState({ title = '오류', message, onRetry, compact = false }: ErrorStateProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={[styles.wrap, compact && styles.compact]}>
      <AppText variant={compact ? 'bodyStrong' : 'sectionTitle'} color="danger" align="center">
        {title}
      </AppText>
      <AppText variant={compact ? 'caption' : 'body'} color="textSecondary" align="center">
        {message}
      </AppText>
      {onRetry ? <Button label="다시 시도" size={compact ? 'sm' : 'md'} onPress={onRetry} /> : null}
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
