import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, useAppTheme, type AppTheme } from '../design-system';

export function EmptyState({ title = '항목 없음', message }: { title?: string; message?: string }) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.wrap}>
      <AppText variant="sectionTitle" align="center">{title}</AppText>
      {message ? <AppText color="textSecondary" align="center">{message}</AppText> : null}
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
  });
}
