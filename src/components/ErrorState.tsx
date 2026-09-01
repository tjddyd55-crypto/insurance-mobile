import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, useAppTheme, type AppTheme } from '../design-system';

type ErrorStateProps = {
  title?: string;
  message: string;
  onRetry?: () => void;
};

export function ErrorState({ title = '오류', message, onRetry }: ErrorStateProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.wrap}>
      <AppText variant="sectionTitle" color="danger" align="center">{title}</AppText>
      <AppText color="textSecondary" align="center">{message}</AppText>
      {onRetry ? <Button label="다시 시도" onPress={onRetry} /> : null}
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
  });
}
